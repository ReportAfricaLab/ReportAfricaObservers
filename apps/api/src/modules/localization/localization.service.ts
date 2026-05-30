import { Injectable } from '@nestjs/common';

const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Navigation
  'nav.feed': { en: 'Feed', fr: 'Fil', ar: 'الخلاصة', pt: 'Feed', sw: 'Mlisho' },
  'nav.search': { en: 'Search', fr: 'Rechercher', ar: 'بحث', pt: 'Buscar', sw: 'Tafuta' },
  'nav.map': { en: 'Map', fr: 'Carte', ar: 'خريطة', pt: 'Mapa', sw: 'Ramani' },
  'nav.live': { en: 'Live', fr: 'En direct', ar: 'مباشر', pt: 'Ao vivo', sw: 'Moja kwa moja' },
  'nav.elections': { en: 'Elections', fr: 'Élections', ar: 'انتخابات', pt: 'Eleições', sw: 'Uchaguzi' },
  'nav.donations': { en: 'Helping Hands', fr: 'Entraide', ar: 'أيادي المساعدة', pt: 'Mãos Amigas', sw: 'Msaada' },
  'nav.media': { en: 'Media', fr: 'Médias', ar: 'إعلام', pt: 'Mídia', sw: 'Vyombo vya habari' },

  // Feed
  'feed.smart': { en: 'Smart', fr: 'Intelligent', ar: 'ذكي', pt: 'Inteligente', sw: 'Akili' },
  'feed.latest': { en: 'Latest', fr: 'Récent', ar: 'الأحدث', pt: 'Recente', sw: 'Mpya' },
  'feed.empty': { en: 'No reports yet. Be the first to report!', fr: 'Aucun rapport. Soyez le premier!', ar: 'لا توجد تقارير بعد. كن أول من يبلغ!', pt: 'Nenhum relatório ainda. Seja o primeiro!', sw: 'Hakuna ripoti bado. Kuwa wa kwanza!' },
  'feed.viewing': { en: 'Viewing', fr: 'Affichage', ar: 'عرض', pt: 'Visualizando', sw: 'Kuangalia' },

  // Report
  'report.create': { en: 'Create Report', fr: 'Créer un rapport', ar: 'إنشاء تقرير', pt: 'Criar Relatório', sw: 'Unda Ripoti' },
  'report.title': { en: 'Title', fr: 'Titre', ar: 'العنوان', pt: 'Título', sw: 'Kichwa' },
  'report.description': { en: 'Description', fr: 'Description', ar: 'الوصف', pt: 'Descrição', sw: 'Maelezo' },
  'report.category': { en: 'Category', fr: 'Catégorie', ar: 'الفئة', pt: 'Categoria', sw: 'Kategoria' },
  'report.severity': { en: 'Severity', fr: 'Gravité', ar: 'الخطورة', pt: 'Gravidade', sw: 'Ukali' },
  'report.submit': { en: 'Submit Report', fr: 'Soumettre', ar: 'إرسال التقرير', pt: 'Enviar Relatório', sw: 'Tuma Ripoti' },
  'report.anonymous': { en: 'Report anonymously', fr: 'Signaler anonymement', ar: 'إبلاغ مجهول', pt: 'Reportar anonimamente', sw: 'Ripoti bila jina' },
  'report.photos': { en: 'Photos / Videos', fr: 'Photos / Vidéos', ar: 'صور / فيديو', pt: 'Fotos / Vídeos', sw: 'Picha / Video' },
  'report.voice': { en: 'Voice to Text', fr: 'Voix en texte', ar: 'صوت إلى نص', pt: 'Voz para Texto', sw: 'Sauti kwa Maandishi' },
  'report.confirm': { en: 'Confirm', fr: 'Confirmer', ar: 'تأكيد', pt: 'Confirmar', sw: 'Thibitisha' },
  'report.dispute': { en: 'Dispute', fr: 'Contester', ar: 'اعتراض', pt: 'Contestar', sw: 'Pinga' },
  'report.views': { en: 'views', fr: 'vues', ar: 'مشاهدات', pt: 'visualizações', sw: 'maoni' },
  'report.comments': { en: 'comments', fr: 'commentaires', ar: 'تعليقات', pt: 'comentários', sw: 'maoni' },
  'report.reportedBy': { en: 'Reported by', fr: 'Signalé par', ar: 'أبلغ عنه', pt: 'Reportado por', sw: 'Imeripotiwa na' },

  // Tips
  'tip.tipReporter': { en: 'Tip Reporter', fr: 'Pourboire', ar: 'إكرامية للمراسل', pt: 'Gorjeta ao Repórter', sw: 'Toa Zawadi' },
  'tip.balance': { en: 'Balance', fr: 'Solde', ar: 'الرصيد', pt: 'Saldo', sw: 'Salio' },
  'tip.buyPack': { en: 'Buy Tip Pack', fr: 'Acheter un pack', ar: 'شراء حزمة', pt: 'Comprar Pacote', sw: 'Nunua Pakiti' },
  'tip.conversionNote': { en: 'Reporter will receive equivalent in their local currency', fr: 'Le journaliste recevra l\'équivalent dans sa monnaie locale', ar: 'سيحصل المراسل على المعادل بعملته المحلية', pt: 'O repórter receberá o equivalente em sua moeda local', sw: 'Mwandishi atapokea sawa katika sarafu yake' },
  'tip.insufficient': { en: 'Insufficient balance. Buy a tip pack first.', fr: 'Solde insuffisant. Achetez un pack d\'abord.', ar: 'رصيد غير كافٍ. اشترِ حزمة أولاً.', pt: 'Saldo insuficiente. Compre um pacote primeiro.', sw: 'Salio haitoshi. Nunua pakiti kwanza.' },

  // Follow
  'follow.follow': { en: 'Follow', fr: 'Suivre', ar: 'متابعة', pt: 'Seguir', sw: 'Fuata' },
  'follow.following': { en: 'Following', fr: 'Suivi', ar: 'متابَع', pt: 'Seguindo', sw: 'Unafuata' },
  'follow.followers': { en: 'Followers', fr: 'Abonnés', ar: 'المتابعون', pt: 'Seguidores', sw: 'Wafuasi' },

  // Comments
  'comment.write': { en: 'Write a comment...', fr: 'Écrire un commentaire...', ar: 'اكتب تعليقاً...', pt: 'Escreva um comentário...', sw: 'Andika maoni...' },
  'comment.empty': { en: 'No comments yet. Be the first!', fr: 'Aucun commentaire. Soyez le premier!', ar: 'لا توجد تعليقات بعد. كن أول من يعلق!', pt: 'Nenhum comentário ainda. Seja o primeiro!', sw: 'Hakuna maoni bado. Kuwa wa kwanza!' },
  'comment.post': { en: 'Post', fr: 'Publier', ar: 'نشر', pt: 'Publicar', sw: 'Chapisha' },

  // Updates
  'update.title': { en: 'Updates', fr: 'Mises à jour', ar: 'التحديثات', pt: 'Atualizações', sw: 'Masasisho' },
  'update.post': { en: 'Post an update on this report...', fr: 'Publier une mise à jour...', ar: 'نشر تحديث على هذا التقرير...', pt: 'Publicar uma atualização...', sw: 'Chapisha sasisho...' },
  'update.empty': { en: 'No updates yet', fr: 'Aucune mise à jour', ar: 'لا توجد تحديثات', pt: 'Nenhuma atualização', sw: 'Hakuna masasisho' },

  // Profile
  'profile.myProfile': { en: 'My Profile', fr: 'Mon Profil', ar: 'ملفي الشخصي', pt: 'Meu Perfil', sw: 'Wasifu Wangu' },
  'profile.editName': { en: 'Tap to edit name', fr: 'Appuyez pour modifier', ar: 'انقر لتعديل الاسم', pt: 'Toque para editar', sw: 'Gusa kuhariri jina' },
  'profile.trustScore': { en: 'Trust Score', fr: 'Score de confiance', ar: 'نقاط الثقة', pt: 'Pontuação de Confiança', sw: 'Alama ya Uaminifu' },
  'profile.tipBalance': { en: 'Tip Balance', fr: 'Solde pourboire', ar: 'رصيد الإكراميات', pt: 'Saldo de Gorjetas', sw: 'Salio la Zawadi' },
  'profile.yourCountry': { en: 'Your Country', fr: 'Votre pays', ar: 'بلدك', pt: 'Seu País', sw: 'Nchi Yako' },

  // Settings
  'settings.title': { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات', pt: 'Configurações', sw: 'Mipangilio' },
  'settings.language': { en: 'Language', fr: 'Langue', ar: 'اللغة', pt: 'Idioma', sw: 'Lugha' },

  // Activity
  'activity.title': { en: 'Activity', fr: 'Activité', ar: 'النشاط', pt: 'Atividade', sw: 'Shughuli' },
  'activity.leaderboard': { en: 'Leaderboard', fr: 'Classement', ar: 'لوحة المتصدرين', pt: 'Classificação', sw: 'Ubao wa Viongozi' },
  'activity.watchlists': { en: 'Watchlists & Alerts', fr: 'Listes et alertes', ar: 'قوائم المراقبة والتنبيهات', pt: 'Listas e Alertas', sw: 'Orodha na Tahadhari' },
  'activity.referral': { en: 'Referral Program', fr: 'Programme de parrainage', ar: 'برنامج الإحالة', pt: 'Programa de Indicação', sw: 'Mpango wa Rufaa' },
  'activity.licenses': { en: 'License Requests', fr: 'Demandes de licence', ar: 'طلبات الترخيص', pt: 'Pedidos de Licença', sw: 'Maombi ya Leseni' },

  // More
  'more.title': { en: 'More', fr: 'Plus', ar: 'المزيد', pt: 'Mais', sw: 'Zaidi' },
  'more.about': { en: 'About', fr: 'À propos', ar: 'حول', pt: 'Sobre', sw: 'Kuhusu' },
  'more.howItWorks': { en: 'How It Works', fr: 'Comment ça marche', ar: 'كيف يعمل', pt: 'Como Funciona', sw: 'Jinsi Inavyofanya Kazi' },
  'more.faq': { en: 'FAQ', fr: 'FAQ', ar: 'الأسئلة الشائعة', pt: 'FAQ', sw: 'Maswali' },
  'more.guidelines': { en: 'Community Guidelines', fr: 'Règles communautaires', ar: 'إرشادات المجتمع', pt: 'Diretrizes da Comunidade', sw: 'Miongozo ya Jamii' },
  'more.privacy': { en: 'Privacy Policy', fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية', pt: 'Política de Privacidade', sw: 'Sera ya Faragha' },
  'more.terms': { en: 'Terms of Service', fr: 'Conditions d\'utilisation', ar: 'شروط الخدمة', pt: 'Termos de Serviço', sw: 'Masharti ya Huduma' },

  // Auth
  'auth.signOut': { en: 'Sign Out', fr: 'Déconnexion', ar: 'تسجيل الخروج', pt: 'Sair', sw: 'Ondoka' },
  'auth.login': { en: 'Log In', fr: 'Connexion', ar: 'تسجيل الدخول', pt: 'Entrar', sw: 'Ingia' },
  'auth.register': { en: 'Sign Up', fr: 'S\'inscrire', ar: 'إنشاء حساب', pt: 'Cadastrar', sw: 'Jisajili' },

  // Emergency
  'emergency.sos': { en: 'Emergency SOS', fr: 'SOS Urgence', ar: 'طوارئ SOS', pt: 'SOS Emergência', sw: 'SOS Dharura' },

  // Leaderboard
  'leaderboard.title': { en: 'Leaderboard', fr: 'Classement', ar: 'لوحة المتصدرين', pt: 'Classificação', sw: 'Ubao wa Viongozi' },
  'leaderboard.week': { en: 'Week', fr: 'Semaine', ar: 'أسبوع', pt: 'Semana', sw: 'Wiki' },
  'leaderboard.month': { en: 'Month', fr: 'Mois', ar: 'شهر', pt: 'Mês', sw: 'Mwezi' },
  'leaderboard.allTime': { en: 'All Time', fr: 'Tout temps', ar: 'كل الأوقات', pt: 'Todo Tempo', sw: 'Wakati Wote' },
  'leaderboard.yourRank': { en: 'Your Rank', fr: 'Votre rang', ar: 'ترتيبك', pt: 'Sua Posição', sw: 'Nafasi Yako' },
  'leaderboard.reports': { en: 'reports', fr: 'rapports', ar: 'تقارير', pt: 'relatórios', sw: 'ripoti' },
  'leaderboard.upvotes': { en: 'upvotes', fr: 'votes', ar: 'تصويتات', pt: 'votos', sw: 'kura' },
};

@Injectable()
export class LocalizationService {
  getTranslations(lang: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, translations] of Object.entries(UI_TRANSLATIONS)) {
      result[key] = translations[lang] || translations['en'] || key;
    }
    return result;
  }

  getSupportedLanguages(): { code: string; name: string; nativeName: string }[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    ];
  }

  getDefaultLanguage(country: string): string {
    const map: Record<string, string> = {
      NG: 'en', GH: 'en', KE: 'en', ZA: 'en', UG: 'en', RW: 'en',
      TZ: 'sw', ET: 'en', SN: 'fr', CM: 'fr', EG: 'ar', MA: 'ar',
      DZ: 'ar', TN: 'ar', CI: 'fr', AO: 'pt', MZ: 'pt', CD: 'fr',
      SD: 'ar', LY: 'ar', ZW: 'en', ZM: 'en', MW: 'en', BJ: 'fr',
      TG: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', SL: 'en', LR: 'en',
      SO: 'ar', MG: 'fr',
    };
    return map[country] || 'en';
  }
}
