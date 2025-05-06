import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import React from 'react';
import App from '../src/App'; 

describe('Input Field Tests', () => {
    it('should render input field with placeholder "Neue Kategorie..."', () => {
        render(<App />);
        const inputElement = screen.getByPlaceholderText('Neue Kategorie...');
        expect(inputElement).toBeInTheDocument(); // Überprüft, ob das Eingabefeld existiert
    });

    it('should ensure the input field has the correct type', () => {
        render(<App />);
        const inputElement = screen.getByPlaceholderText('Neue Kategorie...');
        expect(inputElement).toHaveAttribute('type', 'text'); // Überprüft, ob das Eingabefeld den Typ "text" hat
    });

    it('should ensure the input field is initially empty', () => {
        render(<App />);
        const inputElement = screen.getByPlaceholderText('Neue Kategorie...');
        expect(inputElement).toHaveValue(''); // Überprüft, ob das Eingabefeld leer ist
    });
});