// src/components/PassManagement.tsx

import React, { useState } from 'react';
import { Pass } from '../types/index';
import { generatePassId } from '../utils/passUtils';

const PassManagement = () => {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [passName, setPassName] = useState('');

  const createPass = (name: string) => {
    const newPass: Pass = {
      id: generatePassId(),
      name,
      // other properties...
      status: 'Active',
    };
    setPasses([...passes, newPass]);
  };

  const cancelPass = (passId: string) => {
    setPasses(passes.map(pass => 
      pass.id === passId ? { ...pass, status: 'Cancelled' } : pass
    ));
  };

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (passName.trim()) {
      createPass(passName.trim());
      setPassName('');
    }
  };

  return (
    <div>
      {/* UI for creating a pass */}
      <form onSubmit={handleCreatePass}>
        <input
          type="text"
          value={passName}
          onChange={(e) => setPassName(e.target.value)}
          placeholder="Enter pass name"
          required
        />
        <button type="submit">Create Pass</button>
      </form>

      {/* Display existing passes */}
      {passes.map(pass => (
        <div key={pass.id}>
          <p>ID: {pass.id}</p>
          <p>Name: {pass.name}</p>
          <p>Status: {pass.status}</p>
          {pass.status === 'Active' && (
            <button onClick={() => cancelPass(pass.id)}>Cancel Pass</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PassManagement;