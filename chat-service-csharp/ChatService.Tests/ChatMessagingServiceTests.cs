using ChatService.Common;
using ChatService.DTOs;
using ChatService.Models;
using ChatService.Security;
using ChatService.Services;

namespace ChatService.Tests;

public class ChatMessagingServiceTests
{
    private static CurrentUser Patient(string id = "p1") => new() { Id = id, Role = UserRoles.Patient };
    private static CurrentUser Dentist(string id = "d1") => new() { Id = id, Role = UserRoles.Dentist };
    private static CurrentUser Admin(string id = "a1") => new() { Id = id, Role = UserRoles.Admin };

    private static (ChatMessagingService service, FakeChatRepository repo, FakeAppointmentsRelationClient relation) CreateService()
    {
        var repo = new FakeChatRepository();
        var relation = new FakeAppointmentsRelationClient();
        return (new ChatMessagingService(repo, relation), repo, relation);
    }

    private static Conversation SeedConversation(FakeChatRepository repo, string patientId = "p1", string dentistId = "d1", bool isActive = true)
    {
        var conversation = new Conversation
        {
            Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
            PatientId = patientId,
            DentistId = dentistId,
            IsActive = isActive,
        };
        repo.Conversations.Add(conversation);
        return conversation;
    }

    [Fact]
    public async Task ListConversations_Patient_ReturnsOnlyOwn()
    {
        var (service, repo, _) = CreateService();
        SeedConversation(repo, "p1", "d1");
        SeedConversation(repo, "p2", "d1");

        var result = await service.ListConversationsAsync(Patient("p1"));

        Assert.Single(result);
        Assert.Equal("p1", result[0].PatientId);
    }

    [Fact]
    public async Task ListConversations_Admin_ReturnsAll()
    {
        var (service, repo, _) = CreateService();
        SeedConversation(repo, "p1", "d1");
        SeedConversation(repo, "p2", "d2");

        var result = await service.ListConversationsAsync(Admin());

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task CreateConversation_PatientForeignPatientId_Throws403()
    {
        var (service, _, _) = CreateService();
        var dto = new CreateConversationDto { PatientId = "other", DentistId = "d1" };

        var ex = await Assert.ThrowsAsync<AppException>(() => service.CreateConversationAsync(dto, Patient("p1")));
        Assert.Equal(403, ex.StatusCode);
    }

    [Fact]
    public async Task CreateConversation_InvalidRelation_Throws403()
    {
        var (service, _, relation) = CreateService();
        relation.Allowed = false;
        var dto = new CreateConversationDto { PatientId = "p1", DentistId = "d1" };

        var ex = await Assert.ThrowsAsync<AppException>(() => service.CreateConversationAsync(dto, Patient("p1")));
        Assert.Equal(403, ex.StatusCode);
    }

    [Fact]
    public async Task CreateConversation_Valid_CreatesConversation()
    {
        var (service, repo, _) = CreateService();
        var dto = new CreateConversationDto { PatientId = "p1", DentistId = "d1" };

        var result = await service.CreateConversationAsync(dto, Patient("p1"));

        Assert.NotNull(result.Id);
        Assert.True(result.IsActive);
        Assert.Single(repo.Conversations);
    }

    [Fact]
    public async Task CreateConversation_Existing_IsIdempotent()
    {
        var (service, repo, _) = CreateService();
        var existing = SeedConversation(repo, "p1", "d1");
        var dto = new CreateConversationDto { PatientId = "p1", DentistId = "d1" };

        var result = await service.CreateConversationAsync(dto, Patient("p1"));

        Assert.Equal(existing.Id, result.Id);
        Assert.Single(repo.Conversations);
    }

    [Fact]
    public async Task SendMessage_NonParticipant_Throws403()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");
        var dto = new SendMessageDto { Body = "hola" };

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.SendMessageAsync(conversation.Id!, dto, Patient("intruder")));
        Assert.Equal(403, ex.StatusCode);
    }

    [Fact]
    public async Task SendMessage_InactiveConversation_Throws400()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1", isActive: false);
        var dto = new SendMessageDto { Body = "hola" };

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.SendMessageAsync(conversation.Id!, dto, Patient("p1")));
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task SendMessage_Text_CreatesMessageAndUpdatesPreview()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");
        var dto = new SendMessageDto { Body = "  hola mundo  " };

        var message = await service.SendMessageAsync(conversation.Id!, dto, Patient("p1"));

        Assert.Equal(MessageTypes.Text, message.Type);
        Assert.Equal("hola mundo", message.Body);
        Assert.Null(message.Attachment);
        Assert.Equal("hola mundo", repo.Conversations[0].LastMessagePreview);
        Assert.NotNull(repo.Conversations[0].LastMessageAt);
    }

    [Fact]
    public async Task SendMessage_ImageAttachment_SetsTypeAndPreview()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");
        var dto = new SendMessageDto
        {
            Attachment = new AttachmentDto
            {
                FileId = "file123",
                ContentType = "image/png",
                OriginalName = "radiografia.png",
                Size = 1234,
            },
        };

        var message = await service.SendMessageAsync(conversation.Id!, dto, Dentist("d1"));

        Assert.Equal(MessageTypes.Image, message.Type);
        Assert.NotNull(message.Attachment);
        Assert.Equal("file123", message.Attachment!.FileId);
        Assert.Equal(MessageTypes.Image, message.Attachment.MediaType);
        Assert.Equal("📷 Imagen", repo.Conversations[0].LastMessagePreview);
    }

    [Fact]
    public async Task SendMessage_VideoAttachment_SetsVideoType()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");
        var dto = new SendMessageDto
        {
            Attachment = new AttachmentDto
            {
                FileId = "vid123",
                ContentType = "video/mp4",
                OriginalName = "clip.mp4",
                Size = 99999,
            },
        };

        var message = await service.SendMessageAsync(conversation.Id!, dto, Patient("p1"));

        Assert.Equal(MessageTypes.Video, message.Type);
        Assert.Equal("🎥 Video", repo.Conversations[0].LastMessagePreview);
    }

    [Fact]
    public async Task SendMessage_NoBodyNoAttachment_Throws400()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");
        var dto = new SendMessageDto();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.SendMessageAsync(conversation.Id!, dto, Patient("p1")));
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task ListMessages_NonParticipant_Throws403()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.ListMessagesAsync(conversation.Id!, Patient("intruder"), 30, null));
        Assert.Equal(403, ex.StatusCode);
    }

    [Fact]
    public async Task ListMessages_UnknownConversation_Throws404()
    {
        var (service, _, _) = CreateService();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.ListMessagesAsync("507f1f77bcf86cd799439011", Patient("p1"), 30, null));
        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public async Task MarkAsRead_SetsTimestampForUser()
    {
        var (service, repo, _) = CreateService();
        var conversation = SeedConversation(repo, "p1", "d1");

        await service.MarkAsReadAsync(conversation.Id!, Patient("p1"));

        Assert.True(repo.Conversations[0].LastReadAt.ContainsKey("p1"));
    }
}
