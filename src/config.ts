// Registration settings. Edit these, then rebuild and redeploy.
export const CONFIG = {
  // Google Apps Script web app URL (Deploy > Manage deployments > Web app URL, ends in /exec).
  // While empty, the form shows an error instead of sending.
  webAppUrl: '',

  // WhatsApp community invite link (chat.whatsapp.com/…), shown after every signup attempt, even a failed one.
  // While empty, no join button shows. Keep in sync with "WhatsApp group link" in the Sheet's Settings tab.
  whatsappCommunityUrl: '',

  // Leave name empty until the venue is announced; the page then says "venue to be announced".
  venue: {
    name: '',
    address: '',
    mapsUrl: '',
  },

  whatToBring: 'Your phone. A laptop and charger if you have one.',
};
