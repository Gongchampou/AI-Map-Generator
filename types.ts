
export interface MindMapNodeData {
  id: string;
  topic: string;
  content: string;
  children: MindMapNodeData[];
}

export interface NodePosition extends MindMapNodeData {
  x: number;
  y: number;
  children: NodePosition[];
}
