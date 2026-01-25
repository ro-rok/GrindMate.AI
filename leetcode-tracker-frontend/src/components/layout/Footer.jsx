import { FaGithub, FaLinkedin, FaExternalLinkAlt } from 'react-icons/fa';

/**
 * Footer Component
 * Premium footer with external links and branding
 * Follows Visual Constitution design tokens
 */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-[var(--space-8)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6)] mb-[var(--space-6)]">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
              <span className="text-lg font-semibold text-[var(--text-primary)]">GrindMate.AI</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-[var(--leading-relaxed)]">
              Your AI-powered coding interview companion. Master LeetCode problems with personalized guidance.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              Connect
            </h3>
            <div className="space-y-[var(--space-2)]">
              <a
                href="https://ro-port.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[var(--space-2)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group"
              >
                <FaExternalLinkAlt className="text-xs" />
                <span>Portfolio</span>
              </a>
              <a
                href="https://github.com/ro-rok"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[var(--space-2)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group"
              >
                <FaGithub className="text-sm" />
                <span>GitHub</span>
              </a>
              <a
                href="https://linkedin.com/in/rorok"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[var(--space-2)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group"
              >
                <FaLinkedin className="text-sm" />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Info Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              About
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-[var(--leading-relaxed)]">
              Built for developers who want to ace their coding interviews. Practice with company-specific questions and get instant AI guidance.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-[var(--space-6)] border-t border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-[var(--space-2)]">
            <p className="text-xs text-[var(--text-tertiary)]">
              © {currentYear} GrindMate.AI. All rights reserved.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Made with ❤️ for developers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
