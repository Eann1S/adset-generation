import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Node {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Object, default: {} })
  conditions: {
    [key: string]: string;
  };

  @Prop({ required: true })
  probability: number;

  parent: this;

  children: this[];
}

export const NodeSchema = SchemaFactory.createForClass(Node);
NodeSchema.add({
  children: { type: [Types.ObjectId], ref: 'Node', default: [] },
});
NodeSchema.add({
  parent: { type: Types.ObjectId, ref: 'Node', default: null },
});

export type NodeDocument = HydratedDocument<Node>;
