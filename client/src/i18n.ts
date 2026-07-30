import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    common: {
      brand: "WellCare",
      findHelp: "Find trusted help",
      becomeGuide: "Become a WellCare Guide",
      signIn: "Sign in",
      learnMore: "Learn more",
      sampleStory: "Illustrative story",
    },
    navigation: {
      home: "Home",
      howItWorks: "How It Works",
      about: "About Us",
      guides: "Know Our Guides",
      blogs: "Blogs",
      book: "Book a Guide",
      dashboard: "Dashboard",
      theme: "Change colour theme",
      openMenu: "Open navigation",
    },
    landing: {
      eyebrow: "Real people. Dependable presence.",
      title: "Trusted help for your loved ones, when you cannot be there.",
      description:
        "Book a reliable WellCare Guide for appointments, errands, navigation and patient waiting assistance—while you stay informed.",
      trustLine: "Designed around dignity, clarity and peace of mind.",
      howEyebrow: "Simple by design",
      howTitle: "A dependable hand, in four clear steps.",
      featuresEyebrow: "Help that fits real life",
      featuresTitle: "Thoughtful assistance, backed by useful technology.",
      storiesEyebrow: "Everyday impact",
      storiesTitle: "Small moments of support can change an entire day.",
      guideEyebrow: "A more meaningful way to earn",
      guideTitle: "Turn your time, patience and local knowledge into real impact.",
      trustEyebrow: "Built for trust",
      trustTitle: "Know what is happening, from booking to safe completion.",
      blogEyebrow: "The WellCare Journal",
      blogTitle: "Ideas for making everyday care feel lighter.",
    },
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
