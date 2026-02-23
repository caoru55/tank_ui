import React, { useState } from 'react';
import { createMovement } from '../../app/actions/createMovement';

const CreateMovementButton: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleClick = async () => {
        setLoading(true);
        setMessage(null);
        
        const token = localStorage.getItem('jwt'); // Assuming JWT is stored in local storage
        const movementData = {
            fk_tanks: 'tank_id', // Replace with actual tank ID
            operation: 'operation_type', // Replace with actual operation type
            fk_customers: 'customer_id' // Replace with actual customer ID
        };

        try {
            await createMovement(movementData.fk_tanks, movementData.operation, movementData.fk_customers, token);
            setMessage('Movement created successfully!');
        } catch (error) {
            setMessage('Error creating movement: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <button onClick={handleClick} disabled={loading}>
                {loading ? 'Creating...' : 'Create Movement'}
            </button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default CreateMovementButton;