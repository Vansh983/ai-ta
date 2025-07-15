import os
from dotenv import load_dotenv

load_dotenv()

# // Import the functions you need from the SDKs you need
# import { initializeApp } from "firebase/app";
# import { getAnalytics } from "firebase/analytics";
# // TODO: Add SDKs for Firebase products that you want to use
# // https://firebase.google.com/docs/web/setup#available-libraries

# // Your web app's Firebase configuration
# // For Firebase JS SDK v7.20.0 and later, measurementId is optional
# const firebaseConfig = {
#   apiKey: "AIzaSyDtz0buPdtvA5M8ev4kFVXgGtG7Hj0Re5Q",
#   authDomain: "acadri-e9844.firebaseapp.com",
#   projectId: "acadri-e9844",
#   storageBucket: "acadri-e9844.firebasestorage.app",
#   messagingSenderId: "265522898526",
#   appId: "1:265522898526:web:50ce901bf1c6170871f6cf",
#   measurementId: "G-1YZ01JV99V"
# };

# // Initialize Firebase
# const app = initializeApp(firebaseConfig);
# const analytics = getAnalytics(app);

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
