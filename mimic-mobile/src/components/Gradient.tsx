import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

// Deixa o LinearGradient aceitar `className` do Tailwind.
cssInterop(LinearGradient, { className: 'style' });

export { LinearGradient as Gradient };
