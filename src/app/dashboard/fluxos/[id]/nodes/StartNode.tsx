import { Handle, Position } from 'reactflow';
import { Cable } from 'lucide-react';

const StartNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="bg-green-100 border-2 border-green-600 rounded-lg p-3 shadow-lg min-w-[180px] flex items-center gap-2">
      <Cable className="w-5 h-5 text-green-600" />
      <div className="flex flex-col">
        <span className="font-bold text-green-800">{data.label}</span>
        <span className="text-xs text-green-600">Início do Fluxo</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-600 rounded-full"
      />
    </div>
  );
};

export default StartNode;