import { useEffect } from 'react';

const DocsyLanding = () => {
  // Handle smooth scrolling for anchor links (e.g. clicking "Features" in your layout header)
  useEffect(() => {
    const handleScroll = (e) => {
      const href = e.currentTarget.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    // Attach listener to any anchor links inside this component (if any)
    // or rely on the Layout's header to trigger the scroll via ID presence.
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => link.addEventListener('click', handleScroll));

    return () => {
      links.forEach(link => link.removeEventListener('click', handleScroll));
    };
  }, []);

  return (
    <div className="font-sans bg-white text-[#2D2D2D]">
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-[#F7F9FC] rounded-full text-sm font-medium text-[#3A86FF] mb-4">
                ✨ Simple. Fast. Collaborative.
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Create.<br />
                Collaborate.<br />
                <span className="text-[#3A86FF]">Share.</span>
              </h1>
              <p className="text-xl text-[#6C757D] leading-relaxed">
                Docsy is a lightweight, real-time collaborative word processor designed for seamless teamwork. Docs without the bulk.
              </p>
              <div className="flex gap-4 pt-4">
                <button className="px-8 py-4 bg-[#3A86FF] text-white rounded-xl font-semibold hover:bg-blue-600 transition shadow-lg shadow-[#3A86FF]/30">
                  Start Writing
                </button>
                <button className="px-8 py-4 bg-white border-2 border-[#2D2D2D] text-[#2D2D2D] rounded-xl font-semibold hover:bg-[#F7F9FC] transition">
                  Try Demo
                </button>
              </div>
              <div className="flex items-center gap-6 pt-6 text-sm text-[#6C757D]">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#6EEB83]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#6EEB83]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Free forever</span>
                </div>
              </div>
            </div>

            {/* Editor Mockup */}
            <div className="relative">
              <div className="bg-[#F7F9FC] rounded-2xl shadow-2xl p-6 border border-[#D6D6D6]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#FF595E]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FFBE0B]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#6EEB83]"></div>
                </div>
                <div className="bg-white rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3A86FF] flex items-center justify-center text-white text-sm font-semibold">M</div>
                      <div className="w-8 h-8 rounded-full bg-[#6EEB83] flex items-center justify-center text-white text-sm font-semibold">A</div>
                      <div className="w-8 h-8 rounded-full bg-[#FFBE0B] flex items-center justify-center text-white text-sm font-semibold">S</div>
                    </div>
                    <div className="px-3 py-1 bg-[#6EEB83]/20 text-[#6EEB83] rounded-full text-xs font-medium">
                      3 collaborators
                    </div>
                  </div>
                  <div className="h-3 bg-[#2D2D2D] rounded w-3/4"></div>
                  <div className="h-3 bg-[#ADB5BD]/30 rounded w-full"></div>
                  <div className="h-3 bg-[#ADB5BD]/30 rounded w-5/6"></div>
                  <div className="h-3 bg-[#ADB5BD]/30 rounded w-4/5"></div>
                  <div className="h-20 bg-[#3A86FF]/10 rounded-lg border-2 border-[#3A86FF]/30"></div>
                  <div className="h-3 bg-[#ADB5BD]/30 rounded w-full"></div>
                  <div className="h-3 bg-[#ADB5BD]/30 rounded w-3/4"></div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-[#D6D6D6]">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#6EEB83] animate-pulse"></div>
                  <span className="font-medium">Autosaving...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#F7F9FC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything you need.<br />Nothing you don't.</h2>
            <p className="text-xl text-[#6C757D]">Built for productivity. Designed for simplicity.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition border border-[#D6D6D6]">
              <div className="w-14 h-14 bg-[#3A86FF]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#3A86FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time Collaboration</h3>
              <p className="text-[#6C757D] leading-relaxed">See changes as they happen. Edit together with your team in perfect sync, with live cursors and instant updates.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition border border-[#D6D6D6]">
              <div className="w-14 h-14 bg-[#6EEB83]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#6EEB83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-[#6C757D] leading-relaxed">Start writing instantly. No loading spinners, no lag. Just pure speed and performance.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition border border-[#D6D6D6]">
              <div className="w-14 h-14 bg-[#FFBE0B]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#FFBE0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Easy Sharing</h3>
              <p className="text-[#6C757D] leading-relaxed">Share with a link. Control permissions. Collaborate with anyone, anywhere, anytime.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition border border-[#D6D6D6]">
              <div className="w-14 h-14 bg-[#3A86FF]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#3A86FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Auto-save & Cloud Sync</h3>
              <p className="text-[#6C757D] leading-relaxed">Never lose your work. Everything saves automatically and syncs across all your devices.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition border border-[#D6D6D6]">
              <div className="w-14 h-14 bg-[#6EEB83]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#6EEB83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Distraction-Free Writing</h3>
              <p className="text-[#6C757D] leading-relaxed">Clean interface. No clutter. Just you and your words in a peaceful writing environment.</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition border border-[#D6D6D6]">
              <div className="w-14 h-14 bg-[#FFBE0B]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#FFBE0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Comments</h3>
              <p className="text-[#6C757D] leading-relaxed">Leave feedback, ask questions, and discuss changes right in the document.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Showcase */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for teamwork</h2>
            <p className="text-xl text-[#6C757D]">Watch your ideas come to life together</p>
          </div>

          <div className="bg-gradient-to-br from-[#3A86FF]/5 to-[#6EEB83]/5 rounded-3xl p-8 md:p-12 border border-[#D6D6D6]">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-[#F7F9FC] px-6 py-4 border-b border-[#D6D6D6] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-[#2D2D2D]">Project Proposal Draft</span>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#3A86FF] border-2 border-white flex items-center justify-center text-white text-xs font-semibold">ME</div>
                    <div className="w-8 h-8 rounded-full bg-[#6EEB83] border-2 border-white flex items-center justify-center text-white text-xs font-semibold">AK</div>
                    <div className="w-8 h-8 rounded-full bg-[#FFBE0B] border-2 border-white flex items-center justify-center text-white text-xs font-semibold">SJ</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6EEB83]">
                  <div className="w-2 h-2 rounded-full bg-[#6EEB83] animate-pulse"></div>
                  <span className="font-medium">3 active</span>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="relative">
                  <h3 className="text-2xl font-bold mb-2">Executive Summary</h3>
                  <div className="absolute -left-2 top-0 w-1 h-full bg-[#3A86FF] rounded"></div>
                </div>
                <p className="text-[#6C757D] leading-relaxed">
                  Our proposed solution addresses the growing need for streamlined document collaboration in remote teams...
                </p>
                <div className="bg-[#FFBE0B]/10 border-l-4 border-[#FFBE0B] rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FFBE0B] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">S</div>
                    <div>
                      <p className="font-medium text-sm mb-1">Sarah Johnson</p>
                      <p className="text-sm text-[#6C757D]">Can we add metrics from Q3 here?</p>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <p className="text-[#6C757D] leading-relaxed">
                    <span className="bg-[#6EEB83]/20">The platform will reduce collaboration friction by 40%</span> while maintaining enterprise-grade security standards.
                  </p>
                  <div className="absolute -right-8 top-0 flex items-center gap-1">
                    <div className="w-6 h-6 rounded-full bg-[#6EEB83] border-2 border-white"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Docsy Section */}
      <section id="why" className="py-20 bg-[#F7F9FC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why choose Docsy?</h2>
            <p className="text-xl text-[#6C757D]">The power you need. The simplicity you want.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#D6D6D6]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#3A86FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#3A86FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">No Clutter</h3>
                  <p className="text-[#6C757D]">Unlike bloated alternatives, Docsy gives you only what matters. Clean interface, powerful features.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#D6D6D6]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#6EEB83]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#6EEB83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Faster Load Times</h3>
                  <p className="text-[#6C757D]">Open documents in milliseconds. No more waiting for pages to load.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#D6D6D6]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#FFBE0B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#FFBE0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Minimal Interface</h3>
                  <p className="text-[#6C757D]">Focus on writing, not navigating menus. Everything you need is one click away.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#D6D6D6]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#3A86FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#3A86FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Less Memory Usage</h3>
                  <p className="text-[#6C757D]">Work on multiple documents without slowing down your computer. Optimized for performance.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-[#3A86FF] to-[#6EEB83] rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Focused Writing Environment</h3>
            <p className="text-lg opacity-90">Get in the zone and stay there. Docsy helps you concentrate on what matters: your words.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Loved by teams everywhere</h2>
            <p className="text-xl text-[#6C757D]">See what our users have to say</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-[#F7F9FC] rounded-2xl p-8 border border-[#D6D6D6]">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-5 h-5 text-[#FFBE0B]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#2D2D2D] mb-6 leading-relaxed">"Docsy has completely changed how our team collaborates. It's so fast and simple - we can finally focus on writing instead of fighting with software."</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3A86FF] to-[#6EEB83] flex items-center justify-center text-white font-bold">ES</div>
                <div>
                  <p className="font-semibold">Emma Stevens</p>
                  <p className="text-sm text-[#6C757D]">Content Team Lead</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-[#F7F9FC] rounded-2xl p-8 border border-[#D6D6D6]">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-5 h-5 text-[#FFBE0B]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#2D2D2D] mb-6 leading-relaxed">"As a student, I needed something lightweight for group projects. Docsy is perfect - no lag, easy sharing, and my laptop doesn't sound like a jet engine anymore!"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFBE0B] to-[#FF595E] flex items-center justify-center text-white font-bold">MC</div>
                <div>
                  <p className="font-semibold">Marcus Chen</p>
                  <p className="text-sm text-[#6C757D]">Computer Science Student</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-[#F7F9FC] rounded-2xl p-8 border border-[#D6D6D6]">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-5 h-5 text-[#FFBE0B]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#2D2D2D] mb-6 leading-relaxed">"I've been writing professionally for 15 years. Docsy gives me the clean, distraction-free environment I need without sacrificing collaboration features. It's my new go-to."</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6EEB83] to-[#3A86FF] flex items-center justify-center text-white font-bold">RP</div>
                <div>
                  <p className="font-semibold">Rachel Porter</p>
                  <p className="text-sm text-[#6C757D]">Freelance Writer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#3A86FF] to-[#6EEB83]">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to write better together?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of teams already using Docsy to collaborate seamlessly.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-[#3A86FF] rounded-xl font-semibold hover:bg-gray-50 transition shadow-xl">
              Get Started Free
            </button>
            <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition">
              Schedule Demo
            </button>
          </div>
          <p className="mt-6 text-sm opacity-75">No credit card required • Free forever • 5-minute setup</p>
        </div>
      </section>

    </div>
  );
};

export default DocsyLanding;