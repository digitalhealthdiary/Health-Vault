// Landing page content data types and content
export interface HeroData {
  title: string;
  subtitle: string;
  typewriterWords: string[];
  description: string;
  primaryButton: string;
  secondaryButton: string;
}

export interface FeatureData {
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

export interface StatData {
  value: string;
  label: string;
}

export interface TestimonialData {
  name: string;
  role: string;
  content: string;
  rating: number;
}

export interface TeamMemberData {
  name: string;
  role: string;
  image: string;
  bio: string;
}

export interface AboutData {
  title: string;
  description: string;
  project: {
    title: string;
    description: string;
    technologies: string[];
  };
  team: TeamMemberData[];
}

export interface CTAData {
  title: string;
  description: string;
  primaryButton: string;
  secondaryButton: string;
}

export interface FooterData {
  company: string;
  description: string;
  copyright: string;
  links: {
    features: { name: string; href: string }[];
    support: { name: string; href: string }[];
  };
  social: { name: string; icon: string }[];
}

export interface LandingData {
  hero: HeroData;
  features: FeatureData[];
  stats: StatData[];
  testimonials: TestimonialData[];
  about: AboutData;
  cta: CTAData;
  footer: FooterData;
}

// Landing page content data
export const landingData: LandingData = {
  // Hero section content
  hero: {
    title: "Take Control of Your",
    subtitle: "Health Journey",
    typewriterWords: ["Health Journey", "Wellness Path", "Medical Records", "Vital Signs", "AI Insights"],
    description: "Track vitals, manage medications, and get AI-powered health insights all in one secure platform. Your health data, simplified and protected.",
    primaryButton: "Start Your Journey",
    secondaryButton: "Sign In"
  },

  // Features section
  features: [
    {
      icon: "Activity",
      title: "Vital Signs Tracking",
      description: "Monitor heart rate, blood pressure, and other vital signs with ease.",
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      icon: "Pill",
      title: "Medication Management",
      description: "Never miss a dose with smart reminders and inventory tracking.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: "FileText",
      title: "Medical Records",
      description: "Securely store and organize all your medical documents.",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: "BarChart3",
      title: "AI Health Reports",
      description: "Get personalized health insights powered by advanced AI analysis.",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: "Users",
      title: "Share Access",
      description: "Share your health data securely with doctors and family.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      icon: "Shield",
      title: "Privacy First",
      description: "Your health data is encrypted and completely private.",
      color: "text-teal-600",
      bgColor: "bg-teal-50"
    }
  ],

  // Stats section
  stats: [
    {
      value: "10,000+",
      label: "Active Users"
    },
    {
      value: "500K+",
      label: "Health Records"
    },
    {
      value: "98%",
      label: "User Satisfaction"
    }
  ],

  // Testimonials
  testimonials: [
    {
      name: "Sarah Johnson",
      role: "Patient",
      content: "HealthVault has completely transformed how I manage my health. The AI reports are incredibly insightful!",
      rating: 5
    },
    {
      name: "Dr. Michael Chen",
      role: "Cardiologist",
      content: "My patients love using HealthVault. It makes health tracking so much easier and more accurate.",
      rating: 5
    },
    {
      name: "Emma Davis",
      role: "Nurse",
      content: "The medication reminders and vital tracking features have improved patient compliance significantly.",
      rating: 5
    }
  ],

  // About section
  about: {
    title: "Meet Our Team",
    description: "A dedicated group of final year computer science students passionate about revolutionizing healthcare through technology.",
    project: {
      title: "Final Year Project",
      description: "HealthVault is our final year computer science project, developed as part of our Bachelor's degree program. This application demonstrates our skills in full-stack development, UI/UX design, AI integration, and healthcare technology.",
      technologies: [
        "React & TypeScript",
        "Appwrite Backend",
        "AI Integration",
        "Healthcare Tech",
        "Data Security"
      ]
    },
    team: [
      {
        name: "Sarthak Jambe",
        role: "Full Stack Developer",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
        bio: "Specialized in React, TypeScript, and backend development. Passionate about creating user-friendly health applications."
      },
      {
        name: "Team Member 2",
        role: "UI/UX Designer",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
        bio: "Expert in user experience design and interface development. Focused on creating intuitive healthcare solutions."
      },
      {
        name: "Team Member 3",
        role: "AI/ML Engineer",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
        bio: "Specialized in machine learning and AI integration. Working on intelligent health insights and predictions."
      },
      {
        name: "Team Member 4",
        role: "Database Architect",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
        bio: "Expert in data management and security. Ensuring safe and efficient storage of sensitive health information."
      }
    ]
  },

  // CTA section
  cta: {
    title: "Ready to Transform Your Health Management?",
    description: "Join thousands of users who have taken control of their health with HealthVault.",
    primaryButton: "Start Free Today",
    secondaryButton: "Sign In"
  },

  // Footer
  footer: {
    company: "HealthVault",
    description: "Your comprehensive health management platform.",
    copyright: "© 2026 HealthVault. All rights reserved.",
    links: {
      features: [
        { name: "Vital Tracking", href: "#" },
        { name: "Medication Management", href: "#" },
        { name: "AI Reports", href: "#" },
        { name: "Medical Records", href: "#" }
      ],
      support: [
        { name: "Help Center", href: "#" },
        { name: "Privacy Policy", href: "#" },
        { name: "Terms of Service", href: "#" },
        { name: "Contact Us", href: "#" }
      ]
    },
    social: [
      { name: "LinkedIn", icon: "L" },
      { name: "GitHub", icon: "G" },
      { name: "Twitter", icon: "T" }
    ]
  }
};