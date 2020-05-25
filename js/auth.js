const form = document.querySelector('#sign-in-form');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    let email = form['email'].value;
    let password = form['password'].value;

    auth.signInWithEmailAndPassword(email, password).catch(function(error) {
        console.log(error.message);
    });
    auth.createUserWithEmailAndPassword(email, password).then((cred) => {
        console.log(cred);
        form.reset();
    })
});

auth.onAuthStateChanged(function(user) {
    if(user){
        window.location = "book.html";
    }
});