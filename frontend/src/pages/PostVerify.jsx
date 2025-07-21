// Shows success message and redirects to app
useEffect(() => {
  if (currentUser?.emailVerified) {
    setTimeout(() => navigate('/dashboard'), 3000);
  }
}, [currentUser]);