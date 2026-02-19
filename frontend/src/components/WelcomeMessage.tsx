import { useState, useEffect } from 'react';
import { api } from '../api.js';

interface WelcomeText {
  title: string;
  subtitle: string;
  intro: string;
}

export function WelcomeMessage() {
  const [text, setText] = useState<WelcomeText | null>(null);

  useEffect(() => {
    api.get<WelcomeText>('/text/welcome').then(setText).catch(console.error);
  }, []);

  if (!text) return null;

  return (
    <div className="welcome">
      <h2>{text.title}</h2>
      <p className="subtitle">{text.subtitle}</p>
      <p>{text.intro}</p>
    </div>
  );
}
