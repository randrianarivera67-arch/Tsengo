// src/context/LanguageContext.jsx
import { createContext, useContext, useState } from 'react';

const translations = {
  fr: {
    home:'Accueil',profile:'Profil',friends:'Amis',messages:'Messages',
    notifications:'Notifications',settings:'Paramètres',logout:'Se déconnecter',
    login:'Se connecter',register:"S'inscrire",email:'E-mail',password:'Mot de passe',
    name:'Nom',post:'Publier',comment:'Commenter',like:'Aimer',share:'Partager',
    addFriend:'Ajouter ami',removeFriend:'Retirer ami',friendRequest:"Demande d'ami",
    accept:'Accepter',decline:'Refuser',send:'Envoyer',message:'Message',
    typeMessage:'Écrivez un message...',search:'Rechercher...',
    addPhoto:'Photo',addVideo:'Vidéo',sell:'Vendre',price:'Prix',
    publishPost:'Publier',whatsOnMind:'Quoi de neuf ?',
    myPosts:'Publications',mySales:'Ventes',myFriends:'Amis',
    editProfile:'Modifier le profil',appearance:'Apparence',language:'Langue',
    deletePost:'Supprimer',editPost:'Modifier',noNotifications:'Pas de notifications',
    noMessages:'Pas de messages',online:'En ligne',offline:'Hors ligne',
    bio:'Bio',save:'Enregistrer',cancel:'Annuler',loading:'Chargement...',
    error:'Une erreur est survenue',welcomeTo:'Bienvenue sur',
    createAccount:'Créer un compte',alreadyAccount:'Déjà un compte ?',
    noAccount:'Pas de compte ?',forgotPassword:'Mot de passe oublié ?',
    fullName:'Nom complet',username:"Nom d'utilisateur",
    confirmPassword:'Confirmer le mot de passe',yourFriends:'Vos amis',
    suggestions:'Suggestions',noFriends:'Aucun ami pour le moment',
    viewProfile:'Voir le profil',reactions:'Réactions',allPosts:'Toutes les publications',
    sale:'Vente',writeComment:'Écrire un commentaire...',pendingRequests:'Demandes en attente',
    follow:'Suivre',unfollow:'Ne plus suivre',addFriendBtn:'Ajouter',
  },
  mg: {
    home:'Fandraisana',profile:'Mombamomba',friends:'Namana',messages:'Hafatra',
    notifications:'Fampandrenesana',settings:'Fikirana',logout:'Hivoaka',
    login:'Hiditra',register:'Misoratra',email:'Mailaka',password:'Teny miafina',
    name:'Anarana',post:'Mamoaka',comment:'Hevitra',like:'Tia',share:'Zarao',
    addFriend:'Hanampy namana',removeFriend:'Esory namana',friendRequest:'Fangatahana namana',
    accept:'Ekeo',decline:'Ariana',send:'Alefaso',message:'Hafatra',
    typeMessage:'Soraty hafatra...',search:'Tadiavo...',
    addPhoto:'Sary',addVideo:'Video',sell:'Amidy',price:'Vidiny',
    publishPost:'Mamoaka',whatsOnMind:'Inona no hevitrao?',
    myPosts:'Famoahana',mySales:'Amidy',myFriends:'Namana',
    editProfile:'Ovao ny mombamomba',appearance:'Endrika',language:'Fiteny',
    deletePost:'Fafao',editPost:'Ovao',noNotifications:'Tsy misy fampandrenesana',
    noMessages:'Tsy misy hafatra',online:'Ao an-tserasera',offline:'Tsy ao',
    bio:'Momba ahy',save:'Tehirizo',cancel:'Ajanony',loading:'Miandry...',
    error:'Nisy olana',welcomeTo:'Tonga soa ao',createAccount:'Mamorona kaonty',
    alreadyAccount:'Manana kaonty sahady?',noAccount:'Tsy manana kaonty?',
    forgotPassword:'Adino ny teny miafina?',fullName:'Anarana feno',
    username:'Anarana ampiasaina',confirmPassword:'Avereno ny teny miafina',
    yourFriends:'Ny namanao',suggestions:'Soso-kevitra',noFriends:'Tsy misy namana mbola',
    viewProfile:'Jereo ny mombamomba',reactions:'Fihetsika',allPosts:'Famoahana rehetra',
    sale:'Amidy',writeComment:'Soraty hevitra...',pendingRequests:'Fangatahana miandry',
    follow:'Arahi',unfollow:'Tsy arahi',addFriendBtn:'Hanampy',
  },
  en: {
    home:'Home',profile:'Profile',friends:'Friends',messages:'Messages',
    notifications:'Notifications',settings:'Settings',logout:'Logout',
    login:'Login',register:'Register',email:'Email',password:'Password',
    name:'Name',post:'Post',comment:'Comment',like:'Like',share:'Share',
    addFriend:'Add friend',removeFriend:'Remove friend',friendRequest:'Friend request',
    accept:'Accept',decline:'Decline',send:'Send',message:'Message',
    typeMessage:'Type a message...',search:'Search...',
    addPhoto:'Photo',addVideo:'Video',sell:'Sell',price:'Price',
    publishPost:'Publish',whatsOnMind:"What's on your mind?",
    myPosts:'Posts',mySales:'Sales',myFriends:'Friends',
    editProfile:'Edit profile',appearance:'Appearance',language:'Language',
    deletePost:'Delete',editPost:'Edit',noNotifications:'No notifications',
    noMessages:'No messages',online:'Online',offline:'Offline',
    bio:'Bio',save:'Save',cancel:'Cancel',loading:'Loading...',
    error:'Something went wrong',welcomeTo:'Welcome to',
    createAccount:'Create account',alreadyAccount:'Already have an account?',
    noAccount:"Don't have an account?",forgotPassword:'Forgot password?',
    fullName:'Full name',username:'Username',confirmPassword:'Confirm password',
    yourFriends:'Your friends',suggestions:'Suggestions',noFriends:'No friends yet',
    viewProfile:'View profile',reactions:'Reactions',allPosts:'All posts',
    sale:'Sale',writeComment:'Write a comment...',pendingRequests:'Pending requests',
    follow:'Follow',unfollow:'Unfollow',addFriendBtn:'Add',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // ✅ Langue par défaut : français
  const [lang, setLang] = useState(localStorage.getItem('tsengo_lang') || 'fr');

  const changeLang = l => { setLang(l); localStorage.setItem('tsengo_lang', l); };
  const t = key => translations[lang]?.[key] || translations['fr'][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
