import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
<<<<<<< Updated upstream
import YourComponent from '../src/App'; // Replace with the actual path to your component

describe('YourComponent', () => {
    test('renders input field with placeholder "Neue Kategorie..."', () => {
        render(<YourComponent />);
=======
import App from '../src/App'; // Replace with the actual path to your component

describe('YourComponent', () => {
    test('renders input field with placeholder "Neue Kategorie..."', () => {
        render(<App />);
>>>>>>> Stashed changes
        const inputElement = screen.getByPlaceholderText('Neue Kategorie...');
        expect(inputElement).toBeInTheDocument();
    });
});