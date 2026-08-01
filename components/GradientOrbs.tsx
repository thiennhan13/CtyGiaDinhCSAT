export function GradientOrbs() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
    >
      {/* Bao bọc toàn bộ với opacity giảm xuống để nền dịu hơn */}
      <div className="absolute inset-0 w-full h-full opacity-40 dark:opacity-[0.10]">
        
        {/* Google Blue - Góc trên trái */}
        <div
          className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full blur-[100px] animate-float-1"
          style={{ background: 'radial-gradient(circle, rgba(66,133,244,0.4) 0%, transparent 70%)' }}
        />

        {/* Google Green - Góc dưới phải */}
        <div
          className="absolute -bottom-[15%] -right-[10%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px] animate-float-3"
          style={{ background: 'radial-gradient(circle, rgba(52,168,83,0.35) 0%, transparent 70%)' }}
        />

        {/* Google Yellow - Góc dưới trái (nhỏ, tạo điểm nhấn nhẹ) */}
        <div
          className="absolute bottom-[10%] left-[10%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] rounded-full blur-[90px] animate-float-1"
          style={{ 
            animationDelay: '2s',
            background: 'radial-gradient(circle, rgba(251,188,5,0.25) 0%, transparent 70%)' 
          }}
        />

      </div>
    </div>
  );
}
