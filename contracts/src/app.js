import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const App = () => {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    const initProvider = async () => {
      try {
        const providerInstance = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        await providerInstance.ready;
        setProvider(providerInstance);
      } catch (error) {
        console.error('Error connecting to network:', error);
      }
    };

    initProvider();
  }, []);

  if (!provider) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>PP Voting App</h1>
      <p>Connected to local Hardhat network successfully.</p>
    </div>
  );
};

export default App;
