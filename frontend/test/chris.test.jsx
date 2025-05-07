import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import App from '../src/App'; // Replace with the actual path to your component

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import App from '../src/App'; // Replace with the actual path to your component

describe('YourComponent', () => {
    test('renders input field with placeholder "Neue Kategorie..."', () => {
        render(<App />);
        const inputElement = screen.getByPlaceholderText('Neue Kategorie...');
        expect(inputElement).toBeInTheDocument();
    });
});