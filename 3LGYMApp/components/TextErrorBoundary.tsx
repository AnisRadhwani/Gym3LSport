import React from 'react';
import { View, Text } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';

interface TextErrorBoundaryProps {
  children: React.ReactNode;
  fallbackText?: string;
}

// Simple fallback component that safely renders text
const TextErrorFallback = ({ fallbackText = 'Error rendering content' }: { fallbackText?: string }) => {
  return (
    <View style={{ padding: 8 }}>
      <Text style={{ color: '#FF3B30' }}>{fallbackText}</Text>
    </View>
  );
};

// Error boundary specifically for catching text rendering errors
export const TextErrorBoundary: React.FC<TextErrorBoundaryProps> = ({ 
  children, 
  fallbackText 
}) => {
  return (
    <ErrorBoundary
      onError={(error, info) => {
        // Surface more context in Metro logs to help locate
        // "Text strings must be rendered..." issues.
        console.error('TextErrorBoundary caught error:', error);
        console.error('TextErrorBoundary component stack:', info?.componentStack);
      }}
      fallbackRender={({ error }) => {
        // Check if it's a text rendering error
        const isTextError = error.message && 
          error.message.includes('Text strings must be rendered within a <Text>');
        
        if (isTextError) {
          return <TextErrorFallback fallbackText={fallbackText} />;
        }
        
        // If it's not a text error, rethrow it
        throw error;
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default TextErrorBoundary; 