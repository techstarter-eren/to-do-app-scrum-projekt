import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App'; // Passe den Pfad zu deiner Komponente an
import '@testing-library/jest-dom';

describe('App Komponente', () => {
  beforeEach(() => {
    // Vor jedem Test wird die App neu gerendert
    render(<App />);
  });

  it('stellt das Eingabefeld für neue Kategorien dar', () => {
    const newCategoryInput = screen.getByPlaceholderText('Neue Kategorie...');
    expect(newCategoryInput).not.toBeNull(); // Überprüft, ob das Eingabefeld existiert
  });

  it('ermöglicht das Hinzufügen einer neuen Kategorie', async () => {
    const newCategoryInput = screen.getByPlaceholderText('Neue Kategorie...');
    const addCategoryButton = screen.getByText('Kategorie hinzufügen');

    // Neue Kategorie eingeben
    fireEvent.change(newCategoryInput, { target: { value: 'Einkaufen' } });

    // Button klicken
    fireEvent.click(addCategoryButton);

    // Debugging-Hilfe: Zeige die aktuelle DOM-Struktur
    //screen.debug();

    // Erwartung: Die neue Kategorie erscheint als Button oder Text
    const newCategory = await waitFor(() =>
      screen.getByText((content, element) => {
        return content.includes('Einkaufen') && element.tagName.toLowerCase() === 'button';
      })
    );
    expect(newCategory).not.toBeNull(); // Überprüft, ob die neue Kategorie existiert

    // Eingabefeld sollte geleert sein
    expect(newCategoryInput.value).toBe('');

    // Lösch-Button finden und klicken
    const buttonDeleteCategory = screen.getByText('🗑️'); // Sucht nach dem Lösch-Button
    fireEvent.click(buttonDeleteCategory);

    // Erwartung: Die Kategorie sollte nicht mehr existieren
    await waitFor(() => {
      expect(screen.queryByText('Einkaufen')).toBeNull();
    });
  });
});