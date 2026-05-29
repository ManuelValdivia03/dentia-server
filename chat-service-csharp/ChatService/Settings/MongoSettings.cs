namespace ChatService.Settings;

public class MongoSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "dentia_chat";
    public string ConversationsCollection { get; set; } = "conversations";
    public string MessagesCollection { get; set; } = "messages";
}
