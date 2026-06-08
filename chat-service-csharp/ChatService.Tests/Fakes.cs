using ChatService.Models;
using ChatService.Services;
using MongoDB.Bson;

namespace ChatService.Tests;

public class FakeChatRepository : IChatRepository
{
    public List<Conversation> Conversations { get; } = new();
    public List<Message> Messages { get; } = new();

    public Task<List<Conversation>> ListConversationsForPatientAsync(string patientId) =>
        Task.FromResult(Conversations.Where(c => c.PatientId == patientId).ToList());

    public Task<List<Conversation>> ListConversationsForDentistAsync(string dentistId) =>
        Task.FromResult(Conversations.Where(c => c.DentistId == dentistId).ToList());

    public Task<List<Conversation>> ListAllConversationsAsync() =>
        Task.FromResult(Conversations.ToList());

    public Task<Conversation?> FindConversationByPairAsync(string patientId, string dentistId) =>
        Task.FromResult(Conversations.FirstOrDefault(c => c.PatientId == patientId && c.DentistId == dentistId));

    public Task<Conversation?> FindConversationByIdAsync(string id) =>
        Task.FromResult(Conversations.FirstOrDefault(c => c.Id == id));

    public Task<Conversation> CreateConversationAsync(Conversation conversation)
    {
        conversation.Id ??= ObjectId.GenerateNewId().ToString();
        Conversations.Add(conversation);
        return Task.FromResult(conversation);
    }

    public Task<List<Message>> ListMessagesAsync(string conversationId, int limit, string? before)
    {
        var query = Messages
            .Where(m => m.ConversationId == conversationId && !m.Deleted);

        if (!string.IsNullOrWhiteSpace(before))
        {
            query = query.Where(m => string.CompareOrdinal(m.Id, before) < 0);
        }

        return Task.FromResult(query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .ToList());
    }

    public Task<Message> CreateMessageAsync(Message message)
    {
        message.Id ??= ObjectId.GenerateNewId().ToString();
        Messages.Add(message);
        return Task.FromResult(message);
    }

    public Task UpdateConversationLastMessageAsync(string conversationId, string preview, DateTime at)
    {
        var conversation = Conversations.FirstOrDefault(c => c.Id == conversationId);
        if (conversation is not null)
        {
            conversation.LastMessagePreview = preview;
            conversation.LastMessageAt = at;
            conversation.UpdatedAt = at;
        }

        return Task.CompletedTask;
    }

    public Task SetLastReadAsync(string conversationId, string userId, DateTime at)
    {
        var conversation = Conversations.FirstOrDefault(c => c.Id == conversationId);
        conversation?.LastReadAt.Add(userId, at);
        return Task.CompletedTask;
    }
}

public class FakeAppointmentsRelationClient : IAppointmentsRelationClient
{
    public bool Allowed { get; set; } = true;
    public int Calls { get; private set; }

    public Task<bool> HasPatientDentistRelationAsync(string patientId, string dentistId)
    {
        Calls++;
        return Task.FromResult(Allowed);
    }
}
