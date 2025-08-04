interface LoadingProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Loading = ({ fullScreen = false, size = 'md' }: LoadingProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const spinner = (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass p-8 rounded-2xl">
          {spinner}
          <p className="text-white mt-4 text-center">Chargement...</p>
        </div>
      </div>
    );
  }

  return spinner;
};

export default Loading;