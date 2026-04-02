import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header and navigation', () => {
  render(<App />);

  expect(screen.getByText(/Vaybe/i)).toBeInTheDocument();
  expect(screen.getByText(/Candidatures/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Opportunités/i })).toBeInTheDocument();
  expect(screen.queryByText(/^Admin$/i)).not.toBeInTheDocument();
});
