const LoadingSpinner = () => {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full"></div>
      </div>
    );
  };
  
  export default LoadingSpinner;
  