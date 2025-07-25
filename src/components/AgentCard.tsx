import React from 'react';

interface AgentCardProps {
  name: string;
  description: string;
  price: string;
}

const AgentCard: React.FC<AgentCardProps> = ({ name, description, price }) => {
  return (
    <div className="p-4 border rounded shadow hover:shadow-md transition">
      <h3 className="text-xl font-semibold mb-2">{name}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="text-right">
        <span className="text-lg font-bold text-blue-600">{price}</span>
      </div>
    </div>
  );
};

export default AgentCard;
