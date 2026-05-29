using ChatService.DTOs;
using ChatService.Models;
using ChatService.Security;

namespace ChatService.Services;

public interface IChatMessagingService
{
    Task<List<Conversation>> ListConversationsAsync(CurrentUser user);
    Task<Conversation> CreateConversationAsync(CreateConversationDto dto, CurrentUser user);
    Task<List<Message>> ListMessagesAsync(string conversationId, CurrentUser user, int limit, string? before);
    Task<Message> SendMessageAsync(string conversationId, SendMessageDto dto, CurrentUser user);
    Task<object> MarkAsReadAsync(string conversationId, CurrentUser user);
}
