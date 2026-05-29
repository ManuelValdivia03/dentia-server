using ChatService.Models;
using ChatService.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ChatService.Services;

public class ChatRepository : IChatRepository
{
    private readonly IMongoCollection<Conversation> _conversations;
    private readonly IMongoCollection<Message> _messages;

    public ChatRepository(IOptions<MongoSettings> options, IConfiguration configuration)
    {
        var settings = options.Value;

        // The legacy NestJS service was configured via MONGODB_URI (connection string
        // with the database name embedded). Keep reading it so dev/prod env stay unchanged.
        var uri = configuration["MONGODB_URI"];

        MongoUrl? mongoUrl = string.IsNullOrWhiteSpace(uri) ? null : new MongoUrl(uri);

        var connectionString = mongoUrl?.ToString() ?? settings.ConnectionString;
        var databaseName = mongoUrl?.DatabaseName ?? settings.DatabaseName;

        var client = new MongoClient(connectionString);
        var database = client.GetDatabase(databaseName);

        _conversations = database.GetCollection<Conversation>(settings.ConversationsCollection);
        _messages = database.GetCollection<Message>(settings.MessagesCollection);

        EnsureIndexes();
    }

    private void EnsureIndexes()
    {
        var conversationPair = new CreateIndexModel<Conversation>(
            Builders<Conversation>.IndexKeys.Ascending(c => c.PatientId).Ascending(c => c.DentistId),
            new CreateIndexOptions { Unique = true });

        _conversations.Indexes.CreateOne(conversationPair);

        var messageCursor = new CreateIndexModel<Message>(
            Builders<Message>.IndexKeys.Ascending(m => m.ConversationId).Descending(m => m.CreatedAt));

        _messages.Indexes.CreateOne(messageCursor);
    }

    public Task<List<Conversation>> ListConversationsForPatientAsync(string patientId) =>
        ListConversationsAsync(Builders<Conversation>.Filter.Eq(c => c.PatientId, patientId));

    public Task<List<Conversation>> ListConversationsForDentistAsync(string dentistId) =>
        ListConversationsAsync(Builders<Conversation>.Filter.Eq(c => c.DentistId, dentistId));

    public Task<List<Conversation>> ListAllConversationsAsync() =>
        ListConversationsAsync(Builders<Conversation>.Filter.Empty);

    private Task<List<Conversation>> ListConversationsAsync(FilterDefinition<Conversation> filter)
    {
        return _conversations
            .Find(filter)
            .Sort(Builders<Conversation>.Sort
                .Descending(c => c.LastMessageAt)
                .Descending(c => c.UpdatedAt))
            .ToListAsync();
    }

    public async Task<Conversation?> FindConversationByPairAsync(string patientId, string dentistId)
    {
        var filter = Builders<Conversation>.Filter.And(
            Builders<Conversation>.Filter.Eq(c => c.PatientId, patientId),
            Builders<Conversation>.Filter.Eq(c => c.DentistId, dentistId));

        return await _conversations.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<Conversation?> FindConversationByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return null;
        }

        return await _conversations.Find(c => c.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Conversation> CreateConversationAsync(Conversation conversation)
    {
        await _conversations.InsertOneAsync(conversation);
        return conversation;
    }

    public Task<List<Message>> ListMessagesAsync(string conversationId, int limit, string? before)
    {
        var builder = Builders<Message>.Filter;
        var filter = builder.And(
            builder.Eq(m => m.ConversationId, conversationId),
            builder.Eq(m => m.Deleted, false));

        if (!string.IsNullOrWhiteSpace(before) && ObjectId.TryParse(before, out var beforeId))
        {
            filter = builder.And(filter, builder.Lt("_id", beforeId));
        }

        return _messages
            .Find(filter)
            .Sort(Builders<Message>.Sort.Descending(m => m.CreatedAt))
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<Message> CreateMessageAsync(Message message)
    {
        await _messages.InsertOneAsync(message);
        return message;
    }

    public Task UpdateConversationLastMessageAsync(string conversationId, string preview, DateTime at)
    {
        var update = Builders<Conversation>.Update
            .Set(c => c.LastMessagePreview, preview)
            .Set(c => c.LastMessageAt, at)
            .Set(c => c.UpdatedAt, at);

        return _conversations.UpdateOneAsync(c => c.Id == conversationId, update);
    }

    public Task SetLastReadAsync(string conversationId, string userId, DateTime at)
    {
        var update = Builders<Conversation>.Update
            .Set($"lastReadAt.{userId}", at)
            .Set(c => c.UpdatedAt, at);

        return _conversations.UpdateOneAsync(c => c.Id == conversationId, update);
    }
}
