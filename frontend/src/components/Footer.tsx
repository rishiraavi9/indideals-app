import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: '#1f2937',
      color: '#e5e7eb',
      padding: '48px 24px 24px',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Footer Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40,
          marginBottom: 40,
        }}>
          {/* About Section */}
          <div>
            <h3 style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: 16,
            }}>
              🔥 IndiaDeals
            </h3>
            <p style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#9ca3af',
              margin: 0,
            }}>
              India's best community for finding and sharing amazing deals, discounts, and offers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Quick Links
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}>
              {[
                { label: 'Home', path: '/' },
                { label: 'Popular Deals', path: '/?tab=popular' },
                { label: 'New Deals', path: '/?tab=new' },
                { label: 'Categories', path: '/' },
              ].map((link) => (
                <li key={link.path} style={{ marginBottom: 8 }}>
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.path);
                    }}
                    href={link.path}
                    style={{
                      color: '#9ca3af',
                      textDecoration: 'none',
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Support
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}>
              {[
                { label: 'Help Center', path: '/help' },
                { label: 'Contact Us', path: '/contact' },
                { label: 'Report Deal', path: '/report' },
                { label: 'FAQ', path: '/faq' },
              ].map((link) => (
                <li key={link.path} style={{ marginBottom: 8 }}>
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.path);
                    }}
                    href={link.path}
                    style={{
                      color: '#9ca3af',
                      textDecoration: 'none',
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Legal
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}>
              {[
                { label: 'Terms of Service', path: '/terms' },
                { label: 'Privacy Policy', path: '/privacy' },
                { label: 'Cookie Policy', path: '/cookies' },
                { label: 'Guidelines', path: '/guidelines' },
              ].map((link) => (
                <li key={link.path} style={{ marginBottom: 8 }}>
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.path);
                    }}
                    href={link.path}
                    style={{
                      color: '#9ca3af',
                      textDecoration: 'none',
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          borderTop: '1px solid #374151',
          paddingTop: 24,
        }}>
          {/* Bottom Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <p style={{
              margin: 0,
              fontSize: 14,
              color: '#9ca3af',
            }}>
              © {currentYear} IndiaDeals. All rights reserved.
            </p>

            {/* Social Links */}
            <div style={{
              display: 'flex',
              gap: 16,
            }}>
              {[
                { icon: '𝕏', label: 'Twitter', url: '#' },
                { icon: 'f', label: 'Facebook', url: '#' },
                { icon: 'in', label: 'LinkedIn', url: '#' },
                { icon: '📱', label: 'Instagram', url: '#' },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: 16,
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4b5563';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151';
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p style={{
            marginTop: 24,
            fontSize: 12,
            color: '#6b7280',
            lineHeight: 1.6,
          }}>
            Disclaimer: IndiaDeals is a community platform. We are not responsible for the accuracy of deals or prices.
            Always verify prices and terms on the merchant's website before making a purchase. Some links may be affiliate links.
          </p>
        </div>
      </div>
    </footer>
  );
}
