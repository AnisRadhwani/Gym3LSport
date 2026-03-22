import React, { useRef, useState } from 'react';
import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../../config/tailwind';
import { useLanguage, Language } from '@/hooks/useLanguage';

const { width } = Dimensions.get('window');

const ONBOARDING_KEY = 'onboarding_completed';
const ONBOARDING_PERMANENT_KEY = 'onboarding_permanent_done';

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
];

// Per-slide images shown under the logo (only first 3 slides use photos)
const slideImages = [
  require('../../assets/images/2.jpeg'),
  require('../../assets/images/3.jpeg'),
  require('../../assets/images/4.jpeg'),
  null,
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      key: 'welcome',
      title: {
        en: 'Welcome to 3LGYM',
        fr: 'Bienvenue sur 3LGYM',
        ar: 'مرحباً بك في 3LGYM',
      },
      subtitle: {
        en: 'Your smart companion for staying connected with your gym',
        fr: 'Votre compagnon intelligent pour rester connecté avec votre salle',
        ar: 'رفيقك الذكي للبقاء على اتصال مع ناديك الرياضي',
      },
    },
    {
      key: 'informed',
      title: {
        en: 'Never Miss an Update',
        fr: 'Ne manquez jamais une info',
        ar: 'لا تفوّت أي إشعار',
      },
      subtitle: {
        en: 'Receive real-time notifications\nStay informed about gym events\nImportant announcements from admins',
        fr: 'Recevez des notifications en temps réel\nRestez informé des événements du gym\nAnnonces importantes des administrateurs',
        ar: 'استقبل إشعارات فورية\nابق مطلعاً على فعاليات النادي\nإعلانات مهمة من المشرفين',
      },
    },
    {
      key: 'info',
      title: {
        en: 'Everything You Need to Know',
        fr: 'Tout ce que vous devez savoir',
        ar: 'كل ما تحتاج إلى معرفته',
      },
      subtitle: {
        en: 'View gym opening & closing times\nSee coach schedules\nCheck available sessions and events',
        fr: 'Consultez les horaires d’ouverture et de fermeture\nVoyez les plannings des coachs\nVérifiez les séances et événements disponibles',
        ar: 'اطّلع على أوقات فتح وإغلاق النادي\nشاهد جداول المدربين\nتحقق من الجلسات والفعاليات المتاحة',
      },
    },
    {
      key: 'start',
      title: {
        en: 'Ready to Start?',
        fr: 'Prêt à commencer ?',
        ar: 'هل أنت مستعد للبدء؟',
      },
      subtitle: {
        en: '',
        fr: '',
        ar: '',
      },
    },
  ];

  const getText = (entry: { en: string; fr: string; ar: string }) => entry[language] || entry.en;

  const buttonLabels = {
    signUp: {
      en: 'Create new account - Sign Up',
      fr: 'Créer un nouveau compte - Inscription',
      ar: 'إنشاء حساب جديد - إنشاء حساب',
    },
    signIn: {
      en: 'Already have an account - Sign In',
      fr: 'Vous avez déjà un compte - Connexion',
      ar: 'لديك حساب بالفعل - تسجيل الدخول',
    },
  };

  const handleComplete = async (target: '/auth/sign-in' | '/auth/sign-up') => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await AsyncStorage.setItem(ONBOARDING_PERMANENT_KEY, 'true');
    } catch (e) {
      // ignore storage error, still navigate
    }
    router.replace(target);
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderLanguageSelector = () => (
    <View style={tw`flex-row items-center justify-end px-4 pt-4`}>
      <View style={tw`flex-row items-center bg-gray-100 rounded-full px-2 py-1`}>
        <Feather name="globe" size={16} color="#3B82F6" />
        {languages.map((item) => (
          <TouchableOpacity
            key={item.code}
            onPress={() => setLanguage(item.code)}
            style={tw`${language === item.code ? 'bg-blue-500' : 'bg-transparent'} px-2 py-1 rounded-full ml-1`}
          >
            <Text style={tw`${language === item.code ? 'text-white' : 'text-gray-600'} text-xs font-semibold`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      {renderLanguageSelector()}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <View key={slide.key} style={[tw`px-6`, { width }]}>
            <View style={tw`items-center mt-8`}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={tw`w-35 h-35 mb-6`}
                resizeMode="contain"
              />
            </View>

            {/* Slide illustration image (skip last slide) */}
            {slideImages[index] && (
              <View style={tw`mt-6 mb-4`}>
                <Image
                  // @ts-ignore - we know non-null entries are valid image modules
                  source={slideImages[index]}
                  style={tw`w-full h-48 rounded-3xl`}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={tw`flex-1 justify-center`}>
              <Text style={tw`text-3xl font-bold text-center text-gray-900 mb-4`}>
                {getText(slide.title as any)}
              </Text>
              {slide.subtitle.en.length > 0 && (
                <Text style={tw`text-base text-center text-gray-600 leading-6`}>
                  {getText(slide.subtitle as any)}
                </Text>
              )}
            </View>

            {index === slides.length - 1 && (
              <View style={tw`mb-10`}>
                {/* Create account first */}
                <TouchableOpacity
                  style={tw`bg-blue-500 py-4 rounded-lg items-center mb-4`}
                  onPress={() => handleComplete('/auth/sign-up')}
                >
                  <Text style={tw`text-white font-bold text-lg`}>
                    {getText(buttonLabels.signUp)}
                  </Text>
                </TouchableOpacity>

                {/* Already have account second */}
                <TouchableOpacity
                  style={tw`border border-blue-500 py-4 rounded-lg items-center`}
                  onPress={() => handleComplete('/auth/sign-in')}
                >
                  <Text style={tw`text-blue-500 font-bold text-lg`}>
                    {getText(buttonLabels.signIn)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pagination dots */}
            <View style={tw`flex-row justify-center items-center mb-6`}>
              {slides.map((s, i) => (
                <View
                  key={s.key}
                  style={tw`${i === currentIndex ? 'bg-blue-500 w-6' : 'bg-gray-300 w-2'} h-2 rounded-full mx-1`}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

