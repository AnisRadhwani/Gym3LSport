import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define available languages
export type Language = 'en' | 'fr' | 'ar';

// Create a context for language
type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Record<string, string>;
  t: (key: string, params?: Record<string, any>) => string;
};

const defaultTranslations: Record<string, { en: string; fr: string; ar?: string }> = {
  // Common
  'app.name': { en: '3lgym', fr: '3lgym' },
  'common.loading': { en: 'Loading...', fr: 'Chargement...' },
  'common.error': { en: 'Error', fr: 'Erreur' },
  'common.cancel': { en: 'Cancel', fr: 'Annuler' },
  'common.save': { en: 'Save', fr: 'Enregistrer' },
  'common.edit': { en: 'Edit', fr: 'Modifier' },
  'common.delete': { en: 'Delete', fr: 'Supprimer' },
  'common.back': { en: 'Back', fr: 'Retour' },
  'common.next': { en: 'Next', fr: 'Suivant' },
  'common.tryAgain': { en: 'Try Again', fr: 'Réessayer' },
  'common.success': { en: 'Success', fr: 'Succès' },
  'common.viewAll': { en: 'View All', fr: 'Voir Tout' },
  'common.viewDetails': { en: 'View Details', fr: 'Voir Détails' },
  'common.invalidDate': { en: 'Invalid date', fr: 'Date invalide' },
  'common.configure': { en: 'Configure', fr: 'Configurer' },
  'common.close': { en: 'Close', fr: 'Fermer' },
  'common.ok': { en: 'OK', fr: 'OK', ar: 'موافق' },
  'common.uploading': { en: 'Uploading', fr: 'Téléchargement' },
  
  // Auth
  'auth.signin': { en: 'Sign In', fr: 'Connexion', ar: 'تسجيل الدخول' },
  'auth.signup': { en: 'Sign Up', fr: 'Inscription', ar: 'إنشاء حساب' },
  'auth.logout': { en: 'Logout', fr: 'Déconnexion' },
  'auth.email': { en: 'Email', fr: 'Email' },
  'auth.password': { en: 'Password', fr: 'Mot de passe' },
  'auth.forgotPassword': { en: 'Forgot Password?', fr: 'Mot de passe oublié?', ar: 'هل نسيت كلمة المرور؟' },
  'auth.signInWelcomeTitle': { en: 'Welcome Back', fr: 'Bon Retour', ar: 'مرحباً بعودتك' },
  'auth.signInSubtitle': { en: 'Sign in to continue to 3LGYM', fr: 'Connectez-vous pour continuer vers 3LGYM', ar: 'سجّل الدخول للمتابعة إلى 3LGYM' },
  'auth.signUpTitle': { en: 'Create Account', fr: 'Créer un compte', ar: 'إنشاء حساب' },
  'auth.signUpSubtitle': { en: 'Please fill in the details below', fr: 'Veuillez remplir les informations ci-dessous', ar: 'الرجاء إدخال المعلومات أدناه' },
  
  // Profile
  'profile.title': { en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' },
  'profile.adminTitle': { en: 'Admin Profile', fr: 'Profil Admin', ar: 'ملف المشرف' },
  'profile.fullName': { en: 'Full Name', fr: 'Nom Complet', ar: 'الاسم الكامل' },
  'profile.phoneNumber': { en: 'Phone Number', fr: 'Numéro de Téléphone', ar: 'رقم الهاتف' },
  'profile.email': { en: 'Email', fr: 'Email', ar: 'البريد الإلكتروني' },
  'profile.membershipStatus': { en: 'Membership Status', fr: 'Statut d\'Adhésion', ar: 'حالة الاشتراك' },
  'profile.membershipDaysLeft': { en: 'Days Left', fr: 'Jours Restants', ar: 'الأيام المتبقية' },
  'profile.darkMode': { en: 'Dark Mode', fr: 'Mode Sombre', ar: 'الوضع الداكن' },
  'profile.lightMode': { en: 'Light Mode', fr: 'Mode Clair', ar: 'الوضع الفاتح' },
  'profile.switchToLight': { en: 'Switch to light theme', fr: 'Passer au thème clair', ar: 'التبديل إلى الوضع الفاتح' },
  'profile.switchToDark': { en: 'Switch to dark theme', fr: 'Passer au thème sombre', ar: 'التبديل إلى الوضع الداكن' },
  'profile.language': { en: 'Language', fr: 'Langue', ar: 'اللغة' },
  'profile.english': { en: 'English', fr: 'Anglais', ar: 'الإنجليزية' },
  'profile.french': { en: 'French', fr: 'Français', ar: 'الفرنسية' },
  'profile.arabic': { en: 'Arabic', fr: 'Arabe', ar: 'العربية' },
  'profile.notifications': { en: 'Notifications', fr: 'Notifications', ar: 'الإشعارات' },
  'profile.noNotifications': { en: 'No Notifications', fr: 'Aucune Notification', ar: 'لا توجد إشعارات' },
  'profile.noNotificationsDesc': { en: 'You don\'t have any notifications yet', fr: 'Vous n\'avez pas encore de notifications', ar: 'لا توجد أي إشعارات حتى الآن' },
  'profile.logout': { en: 'Logout', fr: 'Déconnexion', ar: 'تسجيل الخروج' },
  'profile.logoutConfirm': { en: 'Are you sure you want to logout?', fr: 'Êtes-vous sûr de vouloir vous déconnecter?', ar: 'هل أنت متأكد أنك تريد تسجيل الخروج؟' },
  'profile.settings': { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات' },
  'profile.personalInfo': { en: 'Personal Information', fr: 'Informations Personnelles', ar: 'المعلومات الشخصية' },
  'profile.imageUpdated': { en: 'Profile image updated successfully', fr: 'Image de profil mise à jour avec succès', ar: 'تم تحديث صورة الملف الشخصي بنجاح' },
  'profile.imageUpdateFailed': { en: 'Failed to update profile image', fr: 'Échec de la mise à jour de l\'image de profil', ar: 'فشل في تحديث صورة الملف الشخصي' },
  'profile.imageUploading': { en: 'Uploading your profile image...', fr: 'Téléchargement de votre image de profil...', ar: 'جاري رفع صورة الملف الشخصي...' },
  'profile.permissionDenied': { en: 'Permission to access photos was denied', fr: 'L\'autorisation d\'accéder aux photos a été refusée', ar: 'تم رفض الإذن بالوصول إلى الصور' },
  'profile.loginRequired': { en: 'You must be logged in to update your profile', fr: 'Vous devez être connecté pour mettre à jour votre profil', ar: 'يجب أن تكون مسجلاً للدخول لتحديث ملفك الشخصي' },
  'profile.editImage': { en: 'Edit Profile Image', fr: 'Modifier l\'image de profil', ar: 'تعديل صورة الملف الشخصي' },
  'profile.selectImage': { en: 'Select an image from your gallery', fr: 'Sélectionner une image de votre galerie', ar: 'اختر صورة من معرض الصور' },
  
  // Home
  'home.welcome': { en: 'Welcome', fr: 'Bienvenue', ar: 'مرحباً' },
  'home.readyWorkout': { en: 'Ready for your workout?', fr: 'Prêt pour votre entraînement?', ar: 'هل أنت مستعد للتدريب؟' },
  'home.openNow': { en: 'Open Now', fr: 'Ouvert Maintenant', ar: 'مفتوح الآن' },
  'home.closedNow': { en: 'Closed Now', fr: 'Fermé Maintenant', ar: 'مغلق الآن' },
  'home.openFrom': { en: 'Open from', fr: 'Ouvert de', ar: 'مفتوح من' },
  'home.availableCoaches': { en: 'Currently Available Coaches', fr: 'Coachs Actuellement Disponibles', ar: 'المدربون المتاحون حالياً' },
  'home.noCoaches': { en: 'No coaches available right now', fr: 'Aucun coach disponible actuellement', ar: 'لا يوجد مدربون متاحون حالياً' },
  'home.todayEvents': { en: 'Today\'s Events', fr: 'Événements du Jour', ar: 'فعاليات اليوم' },
  'home.noEvents': { en: 'No events scheduled for today', fr: 'Aucun événement prévu aujourd\'hui', ar: 'لا توجد فعاليات مجدولة لليوم' },
  'home.loading': { en: 'Loading...', fr: 'Chargement...', ar: 'جاري التحميل...' },
  'home.tryAgain': { en: 'Try Again', fr: 'Réessayer', ar: 'المحاولة مرة أخرى' },
  'home.signInPrompt': { en: 'Sign in to see real-time data and save your interests', fr: 'Connectez-vous pour voir les données en temps réel et enregistrer vos intérêts', ar: 'سجّل الدخول لرؤية البيانات في الوقت الحقيقي وحفظ اهتماماتك' },

  // Tabs
  'tabs.home': { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
  'tabs.events': { en: 'Events', fr: 'Événements', ar: 'الفعاليات' },
  'tabs.coaches': { en: 'Coaches', fr: 'Coachs', ar: 'المدربون' },
  'tabs.profile': { en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' },
  
  // Coaches
  'coaches.title': { en: 'Coaches', fr: 'Coachs' },
  'coaches.specialty': { en: 'Specialty', fr: 'Spécialité' },
  'coaches.available': { en: 'Available', fr: 'Disponible' },
  'coaches.notAvailable': { en: 'Not Available', fr: 'Non Disponible' },
  'coaches.viewProfile': { en: 'View Profile', fr: 'Voir le Profil' },
  'coaches.workingHours': { en: 'Working Hours', fr: 'Heures de Travail' },
  'coaches.daysAvailable': { en: 'Days Available', fr: 'Jours Disponibles' },
  'coaches.monday': { en: 'Monday', fr: 'Lundi' },
  'coaches.tuesday': { en: 'Tuesday', fr: 'Mardi' },
  'coaches.wednesday': { en: 'Wednesday', fr: 'Mercredi' },
  'coaches.thursday': { en: 'Thursday', fr: 'Jeudi' },
  'coaches.friday': { en: 'Friday', fr: 'Vendredi' },
  'coaches.saturday': { en: 'Saturday', fr: 'Samedi' },
  'coaches.sunday': { en: 'Sunday', fr: 'Dimanche' },
  'coaches.noCoaches': { en: 'No coaches found', fr: 'Aucun coach trouvé' },
  'coaches.search': { en: 'Search coaches...', fr: 'Rechercher des coachs...' },
  
  // Events
  'events.title': { en: 'Events', fr: 'Événements' },
  'events.today': { en: 'Today', fr: 'Aujourd\'hui' },
  'events.upcoming': { en: 'Upcoming', fr: 'À venir' },
  'events.noEvents': { en: 'No events found', fr: 'Aucun événement trouvé' },
  'events.interested': { en: 'Interested', fr: 'Intéressé' },
  'events.location': { en: 'Location', fr: 'Lieu' },
  'events.with': { en: 'with', fr: 'avec' },
  'events.time': { en: 'Time', fr: 'Heure' },
  'events.date': { en: 'Date', fr: 'Date' },
  'events.search': { en: 'Search events...', fr: 'Rechercher des événements...' },
  'events.eventCount': { en: '{count} event', fr: '{count} événement' },
  'events.eventCountPlural': { en: '{count} events', fr: '{count} événements' },

  // Admin Dashboard
  'admin.dashboard.title': { en: 'Admin Dashboard', fr: 'Tableau de Bord Admin' },
  'admin.dashboard.overview': { en: 'Overview', fr: 'Aperçu' },
  'admin.dashboard.members': { en: 'Members', fr: 'Membres' },
  'admin.dashboard.coaches': { en: 'Coaches', fr: 'Coachs' },
  'admin.dashboard.todayEvents': { en: 'Today\'s Events', fr: 'Événements du Jour' },
  'admin.dashboard.gymHours': { en: 'Gym Hours', fr: 'Heures d\'Ouverture' },
  'admin.dashboard.availableCoaches': { en: 'Available Coaches', fr: 'Coachs Disponibles' },
  'admin.dashboard.noCoachesAvailable': { en: 'No coaches available right now', fr: 'Aucun coach disponible actuellement' },
  'admin.dashboard.noEventsToday': { en: 'No events scheduled for today', fr: 'Aucun événement prévu aujourd\'hui' },
  'admin.dashboard.available': { en: 'Available', fr: 'Disponible' },
  'admin.dashboard.workingHours': { en: 'Working Hours', fr: 'Heures de Travail' },
  'admin.dashboard.attendees': { en: 'attendees', fr: 'participants' },
  'admin.dashboard.editHours': { en: 'Edit Hours for {day}', fr: 'Modifier les Heures pour {day}' },
  'admin.dashboard.openingTime': { en: 'Opening Time', fr: 'Heure d\'Ouverture' },
  'admin.dashboard.closingTime': { en: 'Closing Time', fr: 'Heure de Fermeture' },
  'admin.dashboard.days.monday': { en: 'Monday', fr: 'Lundi' },
  'admin.dashboard.days.tuesday': { en: 'Tuesday', fr: 'Mardi' },
  'admin.dashboard.days.wednesday': { en: 'Wednesday', fr: 'Mercredi' },
  'admin.dashboard.days.thursday': { en: 'Thursday', fr: 'Jeudi' },
  'admin.dashboard.days.friday': { en: 'Friday', fr: 'Vendredi' },
  'admin.dashboard.days.saturday': { en: 'Saturday', fr: 'Samedi' },
  'admin.dashboard.days.sunday': { en: 'Sunday', fr: 'Dimanche' },
  'admin.dashboard.welcome': { en: 'Welcome, Admin', fr: 'Bienvenue, Admin' },
  'admin.dashboard.totalMembers': { en: 'Total Members', fr: 'Membres Totaux' },
  'admin.dashboard.totalCoaches': { en: 'Total Coaches', fr: 'Coachs Totaux' },
  'admin.dashboard.activeEventsToday': { en: 'Active Events Today', fr: 'Événements Actifs Aujourd\'hui' },
  'admin.dashboard.openFromTo': { en: 'Open from {open}–{close} today', fr: 'Ouvert de {open}–{close} aujourd\'hui' },
  'admin.dashboard.configureHours': { en: 'Configure Gym Hours', fr: 'Configurer les Heures d\'Ouverture' },

  // Admin Coaches
  'admin.coaches.title': { en: 'Coaches', fr: 'Coachs' },
  'admin.coaches.loading': { en: 'Loading coaches...', fr: 'Chargement des coachs...' },
  'admin.coaches.noCoaches': { en: 'No Coaches Yet', fr: 'Pas Encore de Coachs' },
  'admin.coaches.addFirst': { en: 'Add your first coach to get started', fr: 'Ajoutez votre premier coach pour commencer' },
  'admin.coaches.addCoach': { en: 'Add Coach', fr: 'Ajouter un Coach' },
  'admin.coaches.noResults': { en: 'No Results Found', fr: 'Aucun Résultat Trouvé' },
  'admin.coaches.noMatchingCoaches': { en: 'No coaches match "{query}"', fr: 'Aucun coach ne correspond à "{query}"' },
  'admin.coaches.clearSearch': { en: 'Clear Search', fr: 'Effacer la Recherche' },
  'admin.coaches.overview': { en: 'Coaches Overview', fr: 'Aperçu des Coachs' },
  'admin.coaches.totalCoaches': { en: 'Total Coaches', fr: 'Total des Coachs' },
  'admin.coaches.availableNow': { en: 'Available Now', fr: 'Disponible Maintenant' },
  'admin.coaches.specialties': { en: 'Specialties', fr: 'Spécialités' },
  'admin.coaches.deleteCoach': { en: 'Delete Coach', fr: 'Supprimer le Coach' },
  'admin.coaches.deleteConfirm': { en: 'Are you sure you want to delete {name}?', fr: 'Êtes-vous sûr de vouloir supprimer {name}?' },
  'admin.coaches.deleteSuccess': { en: '{name} has been deleted', fr: '{name} a été supprimé' },
  'admin.coaches.deleteError': { en: 'Failed to delete coach', fr: 'Échec de la suppression du coach' },
  'admin.coaches.errorLoading': { en: 'Failed to load coaches', fr: 'Échec du chargement des coachs' },
  'admin.coaches.searchPlaceholder': { en: 'Search coaches...', fr: 'Rechercher des coachs...' },

  // Admin Events
  'admin.events.title': { en: 'Weekly Events', fr: 'Événements Hebdomadaires' },
  'admin.events.loading': { en: 'Loading events...', fr: 'Chargement des événements...' },
  'admin.events.today': { en: 'Today', fr: 'Aujourd\'hui' },
  'admin.events.eventCount': { en: '{count} event', fr: '{count} événement' },
  'admin.events.eventCountPlural': { en: '{count} events', fr: '{count} événements' },
  'admin.events.noEvents': { en: 'No events', fr: 'Aucun événement' },
  'admin.events.noEventsScheduled': { en: 'No events scheduled for this day', fr: 'Aucun événement prévu pour ce jour' },
  'admin.events.addEvent': { en: 'Add Event', fr: 'Ajouter un Événement' },
  'admin.events.deleteEvent': { en: 'Delete Event', fr: 'Supprimer l\'Événement' },
  'admin.events.deleteConfirm': { en: 'Are you sure you want to delete this event?', fr: 'Êtes-vous sûr de vouloir supprimer cet événement?' },
  'admin.events.deleteSuccess': { en: 'Event deleted successfully', fr: 'Événement supprimé avec succès' },
  'admin.events.deleteError': { en: 'Failed to delete event. Please try again.', fr: 'Échec de la suppression de l\'événement. Veuillez réessayer.' },
  'admin.events.errorLoading': { en: 'Failed to load events', fr: 'Échec du chargement des événements' },
  'admin.events.recurring': { en: 'Mark as recurring (weekly)', fr: 'Marquer comme récurrent (hebdomadaire)' },
  'admin.events.notRecurring': { en: 'Mark as one-time event', fr: 'Marquer comme événement unique' },
  'admin.events.recurringToggleSuccess': { en: 'Event recurring status updated', fr: 'Statut récurrent de l\'événement mis à jour' },
  'admin.events.recurringToggleError': { en: 'Failed to update recurring status', fr: 'Échec de la mise à jour du statut récurrent' },
  'admin.events.days.monday': { en: 'Monday', fr: 'Lundi' },
  'admin.events.days.tuesday': { en: 'Tuesday', fr: 'Mardi' },
  'admin.events.days.wednesday': { en: 'Wednesday', fr: 'Mercredi' },
  'admin.events.days.thursday': { en: 'Thursday', fr: 'Jeudi' },
  'admin.events.days.friday': { en: 'Friday', fr: 'Vendredi' },
  'admin.events.days.saturday': { en: 'Saturday', fr: 'Samedi' },
  'admin.events.days.sunday': { en: 'Sunday', fr: 'Dimanche' },

  // Admin Users
  'admin.users.title': { en: 'Users', fr: 'Utilisateurs' },
  'admin.users.loading': { en: 'Loading users...', fr: 'Chargement des utilisateurs...' },
  'admin.users.noUsers': { en: 'No Users Yet', fr: 'Pas Encore d\'Utilisateurs' },
  'admin.users.addFirst': { en: 'Add your first user to get started', fr: 'Ajoutez votre premier utilisateur pour commencer' },
  'admin.users.addUser': { en: 'Add User', fr: 'Ajouter un Utilisateur' },
  'admin.users.noResults': { en: 'No Results Found', fr: 'Aucun Résultat Trouvé' },
  'admin.users.noMatchingUsers': { en: 'No users match "{query}"', fr: 'Aucun utilisateur ne correspond à "{query}"' },
  'admin.users.clearSearch': { en: 'Clear Search', fr: 'Effacer la Recherche' },
  'admin.users.deleteUser': { en: 'Delete User', fr: 'Supprimer l\'Utilisateur' },
  'admin.users.deleteConfirm': { en: 'Are you sure you want to delete {name}?', fr: 'Êtes-vous sûr de vouloir supprimer {name}?' },
  'admin.users.deleteSuccess': { en: 'User deleted successfully', fr: 'Utilisateur supprimé avec succès' },
  'admin.users.deleteError': { en: 'Failed to delete user. Please try again.', fr: 'Échec de la suppression de l\'utilisateur. Veuillez réessayer.' },
  'admin.users.filterUsers': { en: 'Filter Users', fr: 'Filtrer les Utilisateurs' },
  'admin.users.selectFilter': { en: 'Select filter option', fr: 'Sélectionner une option de filtre' },
  'admin.users.filterAll': { en: 'All Users', fr: 'Tous les Utilisateurs' },
  'admin.users.filterActive': { en: 'Active Memberships', fr: 'Adhésions Actives' },
  'admin.users.filterExpiring': { en: 'Expiring Soon (< 7 days)', fr: 'Expiration Proche (< 7 jours)' },
  'admin.users.filterExpired': { en: 'Expired Memberships', fr: 'Adhésions Expirées' },
  'admin.users.filteringActive': { en: 'Showing active memberships', fr: 'Affichage des adhésions actives' },
  'admin.users.filteringExpiring': { en: 'Showing expiring memberships', fr: 'Affichage des adhésions expirant bientôt' },
  'admin.users.filteringExpired': { en: 'Showing expired memberships', fr: 'Affichage des adhésions expirées' },
  'admin.users.clearFilter': { en: 'Clear Filter', fr: 'Effacer le Filtre' },
  'admin.users.expired': { en: 'Expired', fr: 'Expiré' },
  'admin.users.daysLeft': { en: 'Days Left: {days}', fr: 'Jours Restants: {days}' },
  'admin.users.unnamed': { en: 'Unnamed User', fr: 'Utilisateur Sans Nom' },
  'admin.users.noPhone': { en: 'No phone number', fr: 'Pas de numéro de téléphone' },
  'admin.users.thisUser': { en: 'this user', fr: 'cet utilisateur' },
  'admin.users.searchPlaceholder': { en: 'Search users...', fr: 'Rechercher des utilisateurs...' },
  'admin.users.filterByCategory': { en: 'By Category', fr: 'Par Catégorie', ar: 'حسب الفئة' },
  'admin.users.filteringCategory': { en: 'Category: {name}', fr: 'Catégorie: {name}', ar: 'الفئة: {name}' },
  'admin.users.notes': { en: 'Notes', fr: 'Notes', ar: 'ملاحظات' },
  'admin.users.notesHint': { en: 'Notes about this user (visible to them on their profile)', fr: 'Notes sur cet utilisateur (visibles sur son profil)', ar: 'ملاحظات حول هذا المستخدم (يراها على ملفه)' },
  'admin.users.notesPlaceholder': { en: 'e.g. preferences, reminders...', fr: 'ex. préférences, rappels...', ar: 'مثال: تفضيلات، تذكيرات...' },

  // Admin Categories
  'admin.categories.title': { en: 'Categories', fr: 'Catégories', ar: 'الفئات' },
  'admin.categories.loading': { en: 'Loading categories...', fr: 'Chargement des catégories...', ar: 'جاري تحميل الفئات...' },
  'admin.categories.noCategories': { en: 'No Categories Yet', fr: 'Pas Encore de Catégories', ar: 'لا توجد فئات بعد' },
  'admin.categories.addFirst': { en: 'Add categories like Karaté, Kickboxing, etc.', fr: 'Ajoutez des catégories (Karaté, Kickboxing, etc.)', ar: 'أضف فئات مثل الكاراتيه، الكيك بوكسينغ، إلخ' },
  'admin.categories.addCategory': { en: 'Add Category', fr: 'Ajouter une Catégorie', ar: 'إضافة فئة' },
  'admin.categories.enterName': { en: 'Please enter a category name', fr: 'Veuillez entrer un nom de catégorie', ar: 'الرجاء إدخال اسم الفئة' },
  'admin.categories.namePlaceholder': { en: 'e.g. Karaté, Kickboxing', fr: 'ex. Karaté, Kickboxing', ar: 'مثال: كاراتيه، كيك بوكسينغ' },
  'admin.categories.addError': { en: 'Failed to add category', fr: 'Échec de l\'ajout de la catégorie', ar: 'فشل في إضافة الفئة' },
  'admin.categories.deleteCategory': { en: 'Delete Category', fr: 'Supprimer la Catégorie', ar: 'حذف الفئة' },
  'admin.categories.deleteConfirm': { en: 'Delete "{name}"? Users in this category will keep it until you edit them.', fr: 'Supprimer « {name} » ? Les utilisateurs garderont cette catégorie jusqu\'à modification.', ar: 'حذف « {name} »؟ سيحتفظ المستخدمون بهذه الفئة حتى تعديلهم.' },
  'admin.categories.deleteError': { en: 'Failed to delete category', fr: 'Échec de la suppression de la catégorie', ar: 'فشل في حذف الفئة' },
  'admin.categories.assignToUser': { en: 'Categories', fr: 'Catégories', ar: 'الفئات' },
  'admin.categories.selectCategories': { en: 'Select categories for this user', fr: 'Sélectionner les catégories pour cet utilisateur', ar: 'اختر الفئات لهذا المستخدم' },
  'admin.categories.none': { en: 'No category', fr: 'Aucune catégorie', ar: 'لا فئة' },

  // Admin Notifications
  'admin.notifications.title': { en: 'Notifications', fr: 'Notifications', ar: 'الإشعارات' },
  'admin.notifications.loading': { en: 'Loading notifications...', fr: 'Chargement des notifications...', ar: 'جاري تحميل الإشعارات...' },
  'admin.notifications.noNotifications': { en: 'No Notifications', fr: 'Aucune Notification', ar: 'لا توجد إشعارات' },
  'admin.notifications.noNotificationsSent': { en: 'You haven\'t sent any notifications yet', fr: 'Vous n\'avez pas encore envoyé de notifications', ar: 'لم ترسل أي إشعارات بعد' },
  'admin.notifications.sendNotification': { en: 'Send Notification', fr: 'Envoyer une Notification', ar: 'إرسال إشعار' },
  'admin.notifications.sentToAll': { en: 'Sent to all users', fr: 'Envoyé à tous les utilisateurs', ar: 'تم الإرسال لجميع المستخدمين' },
  'admin.notifications.sentToUsers': { en: 'Sent to {count} users', fr: 'Envoyé à {count} utilisateurs', ar: 'تم الإرسال إلى {count} مستخدم' },
  'admin.notifications.byCategory': { en: 'By Category', fr: 'Par Catégorie', ar: 'حسب الفئة' },
  'admin.notifications.selectCategories': { en: 'Select categories to send to', fr: 'Sélectionner les catégories', ar: 'اختر الفئات للإرسال' },
  'admin.notifications.notificationTitle': { en: 'Notification Title', fr: 'Titre de l\'notification', ar: 'عنوان الإشعار' },
  'admin.notifications.notificationTitlePlaceholder': { en: 'Reminder: Evening Class!', fr: 'Rappel : Cours du soir !', ar: 'تذكير: حصة المساء!' },
  'admin.notifications.message': { en: 'Message', fr: 'Message', ar: 'الرسالة' },
  'admin.notifications.messagePlaceholder': { en: 'Type your message here...', fr: 'Tapez votre message ici...', ar: 'اكتب رسالتك هنا...' },
  'admin.notifications.charactersRemaining': { en: '{count} characters remaining', fr: '{count} caractères restants', ar: '{count} أحرف متبقية' },
  'admin.notifications.sendTo': { en: 'Send To', fr: 'Envoyer à', ar: 'الإرسال إلى' },
  'admin.notifications.allMembers': { en: 'All Members', fr: 'Tous les membres', ar: 'جميع الأعضاء' },
  'admin.notifications.expiringMemberships': { en: 'Expiring Memberships (7 days)', fr: 'Adhésions en expiration (7 jours)', ar: 'الاشتراكات المنتهية قريباً (7 أيام)' },
  'admin.notifications.expiredMemberships': { en: 'Expired Memberships', fr: 'Adhésions expirées', ar: 'الاشتراكات المنتهية' },
  'admin.notifications.calculatingRecipients': { en: 'Calculating recipients...', fr: 'Calcul des destinataires...', ar: 'جاري حساب المستلمين...' },
  'admin.notifications.willBeSentTo': { en: 'Will be sent to {count} members', fr: 'Sera envoyé à {count} membres', ar: 'سيتم الإرسال إلى {count} عضو' },
  'admin.notifications.enterTitle': { en: 'Please enter a notification title', fr: 'Veuillez entrer un titre pour l\'notification', ar: 'الرجاء إدخال عنوان الإشعار' },
  'admin.notifications.enterMessage': { en: 'Please enter a notification message', fr: 'Veuillez entrer le message de l\'notification', ar: 'الرجاء إدخال نص الإشعار' },
  'admin.notifications.noRecipients': { en: 'No recipients selected. Please adjust targeting options.', fr: 'Aucun destinataire sélectionné. Ajustez les options de ciblage.', ar: 'لم يتم اختيار مستلمين. يرجى تعديل خيارات الاستهداف.' },
  'admin.notifications.confirmSend': { en: 'Confirm Send', fr: 'Confirmer l\'envoi', ar: 'تأكيد الإرسال' },
  'admin.notifications.confirmSendMessage': { en: 'You\'re about to send this notification to {count} members. Continue?', fr: 'Vous allez envoyer cette notification à {count} membres. Continuer ?', ar: 'أنت على وشك إرسال هذا الإشعار إلى {count} عضو. متابعة؟' },
  'admin.notifications.loadUsersError': { en: 'Failed to load users for targeting', fr: 'Échec du chargement des utilisateurs pour le ciblage', ar: 'فشل تحميل المستخدمين للاستهداف' },
  'admin.notifications.sendError': { en: 'Failed to send notification', fr: 'Échec de l\'envoi de l\'notification', ar: 'فشل إرسال الإشعار' },
  'admin.notifications.noPushTokens': { en: 'No users with push tokens found in your selection. Users need to have the app installed and notifications enabled.', fr: 'Aucun utilisateur avec token push dans votre sélection. Les utilisateurs doivent avoir l\'app installée et les notifications activées.', ar: 'لم يتم العثور على مستخدمين لديهم رموز إشعار في اختيارك. يحتاج المستخدمون إلى تثبيت التطبيق وتمكين الإشعارات.' },
  'admin.notifications.warning': { en: 'Warning', fr: 'Attention', ar: 'تحذير' },
  'admin.notifications.sendSuccess': { en: 'Notification sent successfully to {sent} users', fr: 'Notification envoyée avec succès à {sent} utilisateurs', ar: 'تم إرسال الإشعار بنجاح إلى {sent} مستخدم' },
  'admin.notifications.sendSuccessSomeFailed': { en: 'Notification sent successfully to {sent} users ({failed} failed)', fr: 'Notification envoyée à {sent} utilisateurs ({failed} échecs)', ar: 'تم الإرسال إلى {sent} مستخدم ({failed} فشل)' },

  // Profile - Categories (read-only)
  'profile.categories': { en: 'My Categories', fr: 'Mes Catégories', ar: 'فئاتي' },
  'profile.noCategories': { en: 'No categories assigned', fr: 'Aucune catégorie assignée', ar: 'لا توجد فئات معينة' },
  'profile.notesTitle': { en: 'Notes for you', fr: 'Notes pour vous', ar: 'ملاحظات لك' },
  'profile.noNotes': { en: 'No notes from your admin yet.', fr: 'Aucune note de votre administrateur pour le moment.', ar: 'لا توجد ملاحظات من المشرف بعد.' },
};

// Create context
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  translations: {},
  t: (key: string) => key,
});

// Create a hook for using the language context
export const useLanguage = () => useContext(LanguageContext);

// Create provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load language from storage on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('userLanguage');
        if (storedLanguage === 'fr' || storedLanguage === 'en' || storedLanguage === 'ar') {
          setLanguageState(storedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Update translations when language changes
  useEffect(() => {
    const newTranslations: Record<string, string> = {};
    
    // Generate translations based on current language
    Object.keys(defaultTranslations).forEach(key => {
      const entry = defaultTranslations[key];
      newTranslations[key] = entry[language] || entry.en;
    });
    
    setTranslations(newTranslations);
    
    // Save language preference
    AsyncStorage.setItem('userLanguage', language).catch(error => {
      console.error('Error saving language preference:', error);
    });
  }, [language]);

  // Function to set language
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  // Translation function with parameter support
  const t = (key: string, params?: Record<string, any>): string => {
    let translation = translations[key] || key;
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        // Replace simple parameters
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
      });
    }
    
    return translation;
  };

  // Return provider
  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations, t }}>
      {!isLoading && children}
    </LanguageContext.Provider>
  );
};

export default useLanguage; 