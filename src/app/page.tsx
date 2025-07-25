import React from 'react';
import AgentCard from '../components/AgentCard';

const agents = [
  { name: 'GPT-3', description: 'Advanced language model for text generation.', price: '$49.99/mo' },
  { name: 'DALL-E', description: 'Generative AI for creating images from text prompts.', price: '$59.99/mo' },
  { name: 'Codex', description: 'AI for translating natural language to code.', price: '$79.99/mo' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">AI Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <AgentCard
            key={agent.name}
            name={agent.name}
            description={agent.description}
            price={agent.price}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
