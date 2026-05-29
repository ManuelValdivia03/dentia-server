using ChatService.DTOs;
using ChatService.Security;
using ChatService.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChatService.Controllers;

[ApiController]
[Route("chat")]
public class ChatController : ControllerBase
{
    private readonly IChatMessagingService _chatService;
    private readonly ICurrentUserService _currentUserService;

    public ChatController(
        IChatMessagingService chatService,
        ICurrentUserService currentUserService)
    {
        _chatService = chatService;
        _currentUserService = currentUserService;
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> ListConversations()
    {
        var user = _currentUserService.Get();
        return Ok(await _chatService.ListConversationsAsync(user));
    }

    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationDto dto)
    {
        var user = _currentUserService.Get();
        return Ok(await _chatService.CreateConversationAsync(dto, user));
    }

    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> ListMessages(
        [FromRoute] string conversationId,
        [FromQuery] ListMessagesQuery query)
    {
        var user = _currentUserService.Get();
        return Ok(await _chatService.ListMessagesAsync(conversationId, user, query.Limit, query.Before));
    }

    [HttpPost("conversations/{conversationId}/messages")]
    public async Task<IActionResult> SendMessage(
        [FromRoute] string conversationId,
        [FromBody] SendMessageDto dto)
    {
        var user = _currentUserService.Get();
        return Ok(await _chatService.SendMessageAsync(conversationId, dto, user));
    }

    [HttpPatch("conversations/{conversationId}/read")]
    public async Task<IActionResult> MarkAsRead([FromRoute] string conversationId)
    {
        var user = _currentUserService.Get();
        return Ok(await _chatService.MarkAsReadAsync(conversationId, user));
    }
}
