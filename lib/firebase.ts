import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCv8zkwmHNg-LvL9Hp35N_gHDNc1uFw7II',
  authDomain: 'health-37caa.firebaseapp.com',
  databaseURL: 'https://health-37caa-default-rtdb.firebaseio.com',
  projectId: 'health-37caa',
  storageBucket: 'health-37caa.firebasestorage.app',
  messagingSenderId: '176669098529',
  appId: '1:176669098529:web:ba750b27281d43bf749960',
  measurementId: 'G-ZLFQE8WQ5N'
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)
