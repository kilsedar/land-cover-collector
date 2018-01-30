var ln = {
  language: {
    // default values
    code: "en",
    local: "English",
    international: "English"
  },
  init: function() {
    i18n.init({
      lng: ln.language.code,
      ns: "general",
      useCookie: false,
      fallbackLng: "en",
      resGetPath: "locales/__ns__.__lng__.json"
    }, function() {
      ln.getLanguage();
    });
  },
  getLanguage: function() {
    navigator.globalization.getPreferredLanguage(
      function(lang) {
        ln.language.local = lang.value;
        ln.language.code = ln.nativeLanguageNameToISOCode(lang.value);
        ln.language.international = ln.nativeLanguageNameToEnglishName(lang.value);

        if(ln.language.code != "en") {
          i18n.setLng(ln.language.code, function(t) {
            $("body").i18n();
          });
        }
        afterLangInit();
      },
      function(error) {
        console.log(error);
      }
    );
  },
  nativeLanguageNameToISOCode: function(lang) {
    var dict = {},
    llang = lang.toLocaleLowerCase(),
    code = lang.toLocaleLowerCase().substring(0, 2);

    /**
    * JavaScript escapes: http://www.rishida.net/tools/conversion/
    * More languages (ISO 639-1 codes): http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    */
    dict["italiano"] = "it"; // Italian
    dict["\u4E2D\u6587"] = "zh"; // Chinese
    dict["\u0627\u0644\u0639\u0631\u0628\u064A\u0629"] = "ar"; // Arabic
    dict["Espa\u00F1ol"] = "es"; // Spanish
    dict["fran\u00E7ais"] = "fr"; // French

    for(key in dict) {
      if(dict.hasOwnProperty(key)) {
        if(key === llang)
          code = dict[key];
      }
    }
    return code;
  },
  nativeLanguageNameToEnglishName: function(lang) {
    var dict = {},
    llang = lang.toLocaleLowerCase();

    /**
    * JavaScript escapes: http://www.rishida.net/tools/conversion/
    * More languages: http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    */
    dict["italiano"] = "Italian";
    dict["\u4E2D\u6587"] = "Chinese";
    dict["\u0627\u0644\u0639\u0631\u0628\u064A\u0629"] = "Arabic";
    dict["Espa\u00F1ol"] = "Spanish";
    dict["fran\u00E7ais"] = "French";

    for(key in dict) {
      if(dict.hasOwnProperty(key)) {
        if(key === llang)
          lang = dict[key];
      }
    }
    return lang;
  }
};
