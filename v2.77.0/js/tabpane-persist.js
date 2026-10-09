if (typeof Storage !== 'undefined') {
    const activeLanguage = localStorage.getItem('active_language');
    if (activeLanguage) {
        document
            .querySelectorAll('.persistLang-' + activeLanguage)
            .forEach((element) => {
                new bootstrap.Tab(element).show();
            });
    }
}
function persistLang(language) {
    console.log("Klicked persistlang");
    if (typeof Storage !== 'undefined') {
        localStorage.setItem('active_language', language);
        document.querySelectorAll('.persistLang-' + language)
            .forEach((element) => {
                new bootstrap.Tab(element).show();
        });
    }
}
