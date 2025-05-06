import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

// Filename: App.test.jsx

describe('Dark Mode Tests', () => {
    it('should toggle dark mode on and off', () => {
        // Render the component
        render(<App />);

        // Find the dark mode toggle button
        const toggleButton = screen.getByRole('button', { name: /🌙|☀️/ });

        // Initial state: dark mode should not be active
        expect(document.body.className).toBe('');

        // Click to enable dark mode
        fireEvent.click(toggleButton);
        expect(document.body.className).toBe('dark-mode');

        // Click again to disable dark mode
        fireEvent.click(toggleButton);
        expect(document.body.className).toBe('');
    });
});