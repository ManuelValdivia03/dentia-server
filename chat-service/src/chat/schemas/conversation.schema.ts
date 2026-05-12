import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ required: true, index: true })
  patientId: string;

  @Prop({ required: true, index: true })
  dentistId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastMessagePreview?: string;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ type: Object, default: {} })
  lastReadAt: Record<string, Date>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ patientId: 1, dentistId: 1 }, { unique: true });
ConversationSchema.index({ patientId: 1, lastMessageAt: -1 });
ConversationSchema.index({ dentistId: 1, lastMessageAt: -1 });