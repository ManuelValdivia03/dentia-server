using ChatService.Common;
using ChatService.DTOs;
using ChatService.Models;
using ChatService.Security;

namespace ChatService.Services;

public class ChatMessagingService : IChatMessagingService
{
    private const int PreviewLength = 120;

    private readonly IChatRepository _repository;
    private readonly IAppointmentsRelationClient _relationClient;

    public ChatMessagingService(
        IChatRepository repository,
        IAppointmentsRelationClient relationClient)
    {
        _repository = repository;
        _relationClient = relationClient;
    }

    public Task<List<Conversation>> ListConversationsAsync(CurrentUser user) =>
        user.Role switch
        {
            UserRoles.Patient => _repository.ListConversationsForPatientAsync(user.Id),
            UserRoles.Dentist => _repository.ListConversationsForDentistAsync(user.Id),
            _ => _repository.ListAllConversationsAsync(),
        };

    public async Task<Conversation> CreateConversationAsync(CreateConversationDto dto, CurrentUser user)
    {
        AssertCanOpenConversation(dto, user);
        await AssertValidPatientDentistRelationAsync(dto.PatientId, dto.DentistId);

        var existing = await _repository.FindConversationByPairAsync(dto.PatientId, dto.DentistId);
        if (existing is not null)
        {
            return existing;
        }

        return await _repository.CreateConversationAsync(new Conversation
        {
            PatientId = dto.PatientId,
            DentistId = dto.DentistId,
            IsActive = true,
            LastReadAt = new Dictionary<string, DateTime>(),
        });
    }

    public async Task<List<Message>> ListMessagesAsync(string conversationId, CurrentUser user, int limit, string? before)
    {
        var conversation = await FindConversationOrFailAsync(conversationId);
        AssertParticipant(conversation, user);

        return await _repository.ListMessagesAsync(conversationId, limit, before);
    }

    public async Task<Message> SendMessageAsync(string conversationId, SendMessageDto dto, CurrentUser user)
    {
        var conversation = await FindConversationOrFailAsync(conversationId);
        AssertParticipant(conversation, user);

        if (!conversation.IsActive)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Conversation is inactive");
        }

        if (user.Role != UserRoles.Patient && user.Role != UserRoles.Dentist)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Only patient or dentist can send messages");
        }

        var body = dto.Body?.Trim();
        var hasBody = !string.IsNullOrEmpty(body);
        var hasAttachment = dto.Attachment is not null;

        if (!hasBody && !hasAttachment)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Message must contain text or an attachment");
        }

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = user.Id,
            SenderRole = user.Role,
            Body = hasBody ? body : null,
            Type = ResolveType(dto.Attachment),
            Attachment = MapAttachment(dto.Attachment),
        };

        var created = await _repository.CreateMessageAsync(message);

        var now = DateTime.UtcNow;
        await _repository.UpdateConversationLastMessageAsync(
            conversation.Id!,
            BuildPreview(body, hasBody, created.Type),
            now);

        return created;
    }

    public async Task<object> MarkAsReadAsync(string conversationId, CurrentUser user)
    {
        var conversation = await FindConversationOrFailAsync(conversationId);
        AssertParticipant(conversation, user);

        await _repository.SetLastReadAsync(conversation.Id!, user.Id, DateTime.UtcNow);

        return new { ok = true };
    }

    private static string ResolveType(AttachmentDto? attachment)
    {
        if (attachment is null)
        {
            return MessageTypes.Text;
        }

        return attachment.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase)
            ? MessageTypes.Video
            : MessageTypes.Image;
    }

    private static MessageAttachment? MapAttachment(AttachmentDto? attachment)
    {
        if (attachment is null)
        {
            return null;
        }

        return new MessageAttachment
        {
            FileId = attachment.FileId,
            MediaType = ResolveType(attachment),
            ContentType = attachment.ContentType,
            OriginalName = attachment.OriginalName,
            Size = attachment.Size,
        };
    }

    private static string BuildPreview(string? body, bool hasBody, string type)
    {
        if (hasBody)
        {
            return body!.Length > PreviewLength ? body[..PreviewLength] : body;
        }

        return type == MessageTypes.Video ? "🎥 Video" : "📷 Imagen";
    }

    private async Task<Conversation> FindConversationOrFailAsync(string conversationId)
    {
        var conversation = await _repository.FindConversationByIdAsync(conversationId);

        if (conversation is null)
        {
            throw new AppException(StatusCodes.Status404NotFound, "Conversation not found");
        }

        return conversation;
    }

    private static void AssertParticipant(Conversation conversation, CurrentUser user)
    {
        if (user.Role == UserRoles.Admin)
        {
            return;
        }

        var isPatient = user.Role == UserRoles.Patient && conversation.PatientId == user.Id;
        var isDentist = user.Role == UserRoles.Dentist && conversation.DentistId == user.Id;

        if (!isPatient && !isDentist)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "You cannot access this conversation");
        }
    }

    private static void AssertCanOpenConversation(CreateConversationDto dto, CurrentUser user)
    {
        if (user.Role == UserRoles.Admin)
        {
            return;
        }

        if (user.Role == UserRoles.Patient && dto.PatientId != user.Id)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Patient can only open own conversations");
        }

        if (user.Role == UserRoles.Dentist && dto.DentistId != user.Id)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Dentist can only open own conversations");
        }
    }

    private async Task AssertValidPatientDentistRelationAsync(string patientId, string dentistId)
    {
        var allowed = await _relationClient.HasPatientDentistRelationAsync(patientId, dentistId);

        if (!allowed)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Patient and dentist do not have a valid relation");
        }
    }
}
