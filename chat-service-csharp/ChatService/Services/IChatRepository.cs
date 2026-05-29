using ChatService.Models;

namespace ChatService.Services;

public interface IChatRepository
{
    Task<List<Conversation>> ListConversationsForPatientAsync(string patientId);
    Task<List<Conversation>> ListConversationsForDentistAsync(string dentistId);
    Task<List<Conversation>> ListAllConversationsAsync();

    Task<Conversation?> FindConversationByPairAsync(string patientId, string dentistId);
    Task<Conversation?> FindConversationByIdAsync(string id);
    Task<Conversation> CreateConversationAsync(Conversation conversation);

    Task<List<Message>> ListMessagesAsync(string conversationId, int limit, string? before);
    Task<Message> CreateMessageAsync(Message message);

    Task UpdateConversationLastMessageAsync(string conversationId, string preview, DateTime at);
    Task SetLastReadAsync(string conversationId, string userId, DateTime at);
}
