export default function Footer() {
  return (
    <footer className="bg-bg-secondary w-full py-12 px-8 border-t border-border-subtle mt-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl mx-auto">
        <div>
          <p className="text-lg font-bold text-text-primary font-headline mb-4">
            QuantLab Terminal Luxe
          </p>
          <p className="font-body text-sm leading-relaxed text-text-tertiary max-w-md">
            &copy; 2024 QuantLab Terminal Luxe. Engineered for Sovereign Analysts.
            Built upon high-fidelity streaming data and industrial-grade research frameworks.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-accent-blue uppercase tracking-widest mb-2">
              Resources
            </p>
            <a
              className="block text-text-tertiary hover:text-text-primary transition-opacity duration-300 text-sm"
              href="#"
            >
              Project Background
            </a>
            <a
              className="block text-text-tertiary hover:text-text-primary transition-opacity duration-300 text-sm"
              href="#"
            >
              Data Sources
            </a>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-accent-blue uppercase tracking-widest mb-2">
              Technical
            </p>
            <a
              className="block text-text-tertiary hover:text-text-primary transition-opacity duration-300 text-sm"
              href="#"
            >
              Jupyter Notebooks
            </a>
            <a
              className="block text-text-tertiary hover:text-text-primary transition-opacity duration-300 text-sm"
              href="#"
            >
              References
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
