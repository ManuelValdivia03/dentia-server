import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: true, enum: ['PATIENT', 'DENTIST'] })
  senderRole: 'PATIENT' | 'DENTIST';

  @Prop({ required: true, maxlength: 1000 })
  body: string;

  @Prop({ default: false })
  deleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });