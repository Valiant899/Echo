import { db, collection, addDoc, getDocs, query, orderBy } from '../firebase';

export async function createHighlight(highlightData) {
  try {
    const docRef = await addDoc(collection(db, 'highlights'), highlightData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding highlight: ', error);
    throw error;
  }
}

export async function getHighlights() {
  try {
    const q = query(collection(db, 'highlights'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting highlights: ', error);
    throw error;
  }
}