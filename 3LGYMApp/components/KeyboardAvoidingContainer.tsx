import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard, 
  StyleSheet, 
  View, 
  KeyboardAvoidingViewProps,
  ViewStyle,
  ScrollView,
  ScrollViewProps
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAvoidingContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
  withScrollView?: boolean;
  scrollViewProps?: ScrollViewProps;
  dismissKeyboardOnTouch?: boolean;
}

/**
 * A reusable component that handles keyboard avoidance across the app
 * Wraps content in KeyboardAvoidingView with appropriate behavior based on platform
 * Optionally wraps in ScrollView and adds keyboard dismissal on touch
 */
const KeyboardAvoidingContainer: React.FC<KeyboardAvoidingContainerProps> = ({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  withScrollView = false,
  scrollViewProps,
  dismissKeyboardOnTouch = true
}) => {
  const insets = useSafeAreaInsets();
  
  // Calculate additional offset based on safe area insets
  const calculatedOffset = keyboardVerticalOffset + (Platform.OS === 'ios' ? insets.bottom : 0);

  const content = withScrollView ? (
    <ScrollView
      contentContainerStyle={[styles.scrollViewContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
      keyboardVerticalOffset={calculatedOffset}
    >
      {dismissKeyboardOnTouch ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {content}
        </TouchableWithoutFeedback>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default KeyboardAvoidingContainer; 