// ============================================
// MOBILE MENU TOGGLE
// ============================================
function toggleMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  
  // මෙනු එක ඇරලා තියෙද්දී පිටුපස scroll වෙන එක නවත්තන්න
  if (mobileMenu.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// මෙනු එකේ ලින්ක් එකක් එබුවම මෙනු එක වැහෙන්න
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    toggleMobileMenu();
  });
});
