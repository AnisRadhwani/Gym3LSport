import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ marginBottom: 20, color: 'red', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#3B82F6', 
              paddingHorizontal: 20, 
              paddingVertical: 10, 
              borderRadius: 5 
            }}
            onPress={this.resetError}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary; 