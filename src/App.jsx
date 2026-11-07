import { useEffect, useMemo, useState } from 'react';
import { addRow, auth, deleteRow, firebaseEnabled, loadRows, logout, saveRow, signInWithGoogle, updateRow, watchAuth } from './firebase.js';
import GoogleAuthPage from './GoogleAuthPage.jsx';
import { assetUrl } from './assetUrl.js';

const SERVICES = [
  { id: 'plumbing', name: 'Plumbing', description: 'Leaks, fixtures & flowing water', price: 65, icon: 'bi-wrench-adjustable', image: '/images/1.webp', tint: 'mint', rating: '4.9', count: '248' },
  { id: 'electrical', name: 'Electrical', description: 'Safe fixes for the things that spark', price: 75, icon: 'bi-lightning-charge', image: '/images/2.avif', tint: 'yellow', rating: '4.8', count: '186' },
  { id: 'cleaning', name: 'Home cleaning', description: 'A fresh start, room by room', price: 55, icon: 'bi-stars', image: '/images/6.webp', tint: 'rose', rating: '4.9', count: '312' },
  { id: 'painting', name: 'Painting', description: 'Thoughtful color, beautifully applied', price: 90, icon: 'bi-brush', image: '/images/4.webp', tint: 'blue', rating: '4.8', count: '128' },
  { id: 'laundry', name: 'Laundry', description: 'Wash, fold and get your time back', price: 35, icon: 'bi-droplet', image: '/images/5.jpg', tint: 'mint', rating: '4.7', count: '94' },
  { id: 'cooking', name: 'Home cooking', description: 'Good food, made right in your kitchen', price: 60, icon: 'bi-egg-fried', image: '/images/7.webp', tint: 'yellow', rating: '4.9', count: '112' },
  { id: 'appliance', name: 'Appliance repair', description: 'Get your everyday essentials working', price: 70, icon: 'bi-tools', image: '/images/3.avif', tint: 'rose', rating: '4.8', count: '167' },
  { id: 'ac', name: 'AC service', description: 'Cool, comfortable air without the wait', price: 80, icon: 'bi-snow', image: '/images/2.avif', tint: 'blue', rating: '4.8', count: '139' },
];

const PROVIDERS = [
  { id: 'pro-1', name: 'Jordan Lee', specialty: 'Plumbing & appliance repair', rating: 4.9, jobs: 218, initials: 'JL', color: 'avatar-coral' },
  { id: 'pro-2', name: 'Maya Patel', specialty: 'Home cleaning & laundry', rating: 5.0, jobs: 164, initials: 'MP', color: 'avatar-green' },
  { id: 'pro-3', name: 'Ethan Brooks', specialty: 'Electrical & AC service', rating: 4.8, jobs: 193, initials: 'EB', color: 'avatar-blue' },
];

const SAMPLE_REVIEWS = [
  { id: 'review-1', name: 'Amelia R.', serviceName: 'Home cleaning', rating: 5, text: 'I came home to a place that felt brand new. Booking was easy, and Maya was so thoughtful.', createdAt: '2026-10-28' },
  { id: 'review-2', name: 'Marcus T.', serviceName: 'Plumbing', rating: 5, text: 'Jordan found the issue quickly and explained the fix clearly. Exactly the kind of help I needed.', createdAt: '2026-10-24' },
  { id: 'review-3', name: 'Nina S.', serviceName: 'Painting', rating: 4, text: 'On time, careful with the furniture, and the finish looks wonderful. Would book again.', createdAt: '2026-10-18' },
];

const NAV_ITEMS = [
  ['home', 'Home', 'bi-house-door'], ['services', 'Services', 'bi-grid'], ['about', 'About us', 'bi-heart'],
  ['reviews', 'Reviews', 'bi-chat-heart'], ['contact', 'Contact', 'bi-telephone'],
];

const money = (amount) => `$${Number(amount || 0).toFixed(0)}`;

function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('homecare:session') || 'null'); } catch { return null; }
  });
  const [services, setServices] = useState(SERVICES);
  const [providers, setProviders] = useState(PROVIDERS);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);
  const [selectedService, setSelectedService] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = watchAuth((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        localStorage.setItem('homecare:session', JSON.stringify(firebaseUser));
      } else if (auth) {
        setUser(null);
        localStorage.removeItem('homecare:session');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    const customerRows = user?.role === 'admin' ? loadRows('users', [], user) : Promise.resolve([]);
    Promise.all([
      loadRows('services', SERVICES), loadRows('providers', PROVIDERS),
      loadRows('bookings', [], user), loadRows('reviews', SAMPLE_REVIEWS), customerRows,
    ]).then(([serviceRows, providerRows, bookingRows, reviewRows, customerRows]) => {
      if (!active) return;
      setServices(serviceRows.length ? serviceRows : SERVICES);
      setProviders(providerRows.length ? providerRows : PROVIDERS);
      setBookings(bookingRows);
      setReviews(reviewRows.length ? reviewRows : SAMPLE_REVIEWS);
      setCustomers(customerRows.filter((customer) => customer.role !== 'admin'));
      if (firebaseEnabled) {
        if (!serviceRows.length) SERVICES.forEach((service) => saveRow('services', service));
        if (!providerRows.length) PROVIDERS.forEach((provider) => saveRow('providers', provider));
        if (!reviewRows.length) SAMPLE_REVIEWS.forEach((review) => saveRow('reviews', review));
      }
    }).catch(() => showToast('Could not load the latest data. Please refresh to try again.'));
    return () => { active = false; };
  }, [user?.uid, user?.role]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }

  async function refreshCustomers() {
    if (user?.role !== 'admin') return;
    try {
      const rows = await loadRows('users', [], user);
      setCustomers(rows.filter((customer) => customer.role !== 'admin'));
    } catch (error) {
      showToast(error.message || 'Customer accounts could not be loaded.');
    }
  }

  function go(nextPage) {
    setPage(nextPage);
    if (!['booking', 'auth'].includes(nextPage)) setSelectedService(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseService(service) {
    setSelectedService(service);
    setPage('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startBooking(service) {
    setSelectedService(service);
    go(user ? 'booking' : 'auth');
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    try {
      const nextUser = await signInWithGoogle();
      setUser(nextUser);
      localStorage.setItem('homecare:session', JSON.stringify(nextUser));
      showToast(`Welcome${nextUser.name ? `, ${nextUser.name.split(' ')[0]}` : ''}!`);
      go(selectedService ? 'booking' : nextUser.role === 'admin' ? 'admin' : 'home');
    } catch (error) {
      showToast(error.message || 'We could not sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    localStorage.removeItem('homecare:session');
    go('home');
    showToast('You have been signed out.');
  }

  async function createBooking(values) {
    if (!user) return go('auth');
    setBusy(true);
    try {
      const service = services.find((item) => item.id === values.serviceId) || selectedService;
      const booking = await addRow('bookings', {
        userId: user.uid, customerName: user.name, customerEmail: user.email,
        serviceId: service.id, serviceName: service.name, price: service.price,
        date: values.date, time: values.time, address: values.address,
        notes: values.notes, status: 'Requested', paymentStatus: 'Pending',
        createdAt: new Date().toISOString(),
      });
      await addRow('payments', { bookingId: booking.id, userId: user.uid, amount: service.price, status: 'Pending', method: 'Pay after service', createdAt: new Date().toISOString() });
      setBookings((current) => [booking, ...current]);
      showToast('Your booking request is on its way.');
      go('mybookings');
    } catch (error) {
      showToast(error.message || 'Booking could not be saved. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function changeBookingStatus(booking, status) {
    try {
      await updateRow('bookings', booking.id, { status, updatedAt: new Date().toISOString() });
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status } : item));
      showToast(`Booking marked ${status.toLowerCase()}.`);
    } catch (error) { showToast(error.message || 'Booking status could not be updated.'); }
  }

  async function submitReview(values) {
    try {
      const review = await addRow('reviews', { ...values, userId: user.uid, name: user.name, createdAt: new Date().toISOString() });
      setReviews((current) => [review, ...current]);
      showToast('Thanks for sharing your experience.');
    } catch (error) { showToast(error.message || 'Your review could not be saved.'); }
  }

  async function saveService(service) {
    try {
      const saved = await saveRow('services', service);
      setServices((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      showToast('Service details saved.');
    } catch (error) { showToast(error.message || 'Service could not be saved.'); }
  }

  async function removeService(service) {
    if (!window.confirm(`Remove ${service.name} from the service list?`)) return;
    try {
      await deleteRow('services', service.id);
      setServices((current) => current.filter((item) => item.id !== service.id));
      showToast('Service removed.');
    } catch (error) { showToast(error.message || 'Service could not be removed.'); }
  }

  const pageTitle = useMemo(() => ({ home: 'A little help goes a long way.', services: 'Good help, right at home.', about: 'Home should feel like home.', reviews: 'Kind words, real homes.', contact: 'We’re here to help.', mybookings: 'Your home, taken care of.', admin: 'Good morning, HomeCare.', booking: 'Let’s get it taken care of.', detail: selectedService?.name || 'Service details' }[page] || ''), [page, selectedService]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => go('home')} aria-label="HomeCare home">
          <span className="brand-mark"><i className="bi bi-house-heart-fill" /></span>
          <span>homecare<span className="brand-period">.</span></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(([id, label]) => <button key={id} className={page === id ? 'nav-link active' : 'nav-link'} onClick={() => go(id)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          {user ? <div className="account-menu"><span className="account-avatar">{user.name?.slice(0, 1).toUpperCase() || 'H'}</span><span className="account-name">{user.name?.split(' ')[0]}</span><button className="icon-button" title="My bookings" aria-label="My bookings" onClick={() => go('mybookings')}><i className="bi bi-calendar2-check" /></button>{user.role === 'admin' && <button className="icon-button admin-shortcut" title="Admin dashboard" aria-label="Admin dashboard" onClick={() => go('admin')}><i className="bi bi-speedometer2" /></button>}<button className="icon-button" title="Sign out" aria-label="Sign out" onClick={handleLogout}><i className="bi bi-box-arrow-right" /></button></div>
            : <button className="signin-link" onClick={() => go('auth')}>Sign in <i className="bi bi-arrow-up-right" /></button>}
          <button className="header-book" onClick={() => user ? go('booking') : go('auth')}>Book a service <i className="bi bi-arrow-up-right" /></button>
        </div>
        <div className="mobile-nav"><button onClick={() => go('home')} aria-label="Home"><i className="bi bi-house" /></button><button onClick={() => go('services')} aria-label="Services"><i className="bi bi-grid" /></button><button onClick={() => user ? go('mybookings') : go('auth')} aria-label="My bookings"><i className="bi bi-calendar2-check" /></button><button onClick={() => user?.role === 'admin' ? go('admin') : user ? go('mybookings') : go('auth')} aria-label="Account"><i className="bi bi-person" /></button></div>
      </header>

      <main>
        {page === 'home' && <HomePage services={services} providers={providers} onService={chooseService} onBook={startBooking} onNavigate={go} />}
        {page === 'services' && <ServicesPage services={services} onService={chooseService} onBook={startBooking} />}
        {page === 'detail' && selectedService && <DetailPage service={selectedService} providers={providers} onBook={() => startBooking(selectedService)} onBack={() => go('services')} />}
        {page === 'booking' && <BookingPage services={services} selectedService={selectedService} busy={busy} onSubmit={createBooking} onAuth={() => go('auth')} user={user} />}
        {page === 'mybookings' && <BookingsPage bookings={bookings.filter((booking) => user?.role === 'admin' || booking.userId === user?.uid)} user={user} onStatus={changeBookingStatus} onReview={() => go('reviews')} onBrowse={() => go('services')} />}
        {page === 'reviews' && <ReviewsPage reviews={reviews} user={user} onSubmit={submitReview} onAuth={() => go('auth')} />}
        {page === 'about' && <AboutPage onNavigate={go} />}
        {page === 'contact' && <ContactPage onNavigate={go} />}
        {page === 'auth' && <GoogleAuthPage onSubmit={handleGoogleSignIn} busy={busy} onBack={() => go('home')} />}
        {page === 'admin' && (user?.role === 'admin' ? <AdminPage services={services} bookings={bookings} customers={customers} onRefreshCustomers={refreshCustomers} onSaveService={saveService} onDeleteService={removeService} onStatus={changeBookingStatus} onNavigate={go} /> : <AccessDenied onNavigate={go} />)}
      </main>

      {page !== 'admin' && page !== 'auth' && <Footer onNavigate={go} />}
      {toast && <div className="toast-message" role="status"><i className="bi bi-check-circle-fill" />{toast}</div>}
      <div className="sr-only" aria-live="polite">{pageTitle}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy, action, onAction }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{action && <button className="text-action" onClick={onAction}>{action}<i className="bi bi-arrow-up-right" /></button>}</div>;
}

function HomePage({ services, providers, onService, onBook, onNavigate }) {
  const categories = services.slice(0, 4);
  return <>
    <section className="hero-section">
      <div className="hero-copy"><span className="eyebrow"><span className="live-dot" /> YOUR HOME, IN GOOD HANDS</span><h1>A little help<br />goes a <em>long way.</em></h1><p>From the dripping tap to the weekend reset, find lovely, vetted people who make home feel easier.</p><div className="hero-actions"><button className="button-primary" onClick={() => onNavigate('services')}>Explore services <i className="bi bi-arrow-up-right" /></button><button className="button-play" onClick={() => onNavigate('about')}><span><i className="bi bi-play-fill" /></span> How HomeCare works</button></div><div className="hero-proof"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><b>+</b></div><div><strong>4.9 / 5</strong><small>from 2,400+ happy homes</small></div></div></div>
      <div className="hero-visual"><img src={assetUrl('/images/1.webp')} alt="A HomeCare professional carefully repairing a water heater" /><div className="hero-image-wash" /><div className="hero-note"><span className="note-icon"><i className="bi bi-patch-check-fill" /></span><span><strong>People you can trust</strong><small>Vetted, rated and ready to help</small></span><i className="bi bi-arrow-up-right note-arrow" /></div><div className="hero-number">01 <span>— 08</span></div></div>
      <div className="hero-side-label">GOOD HELP, GOOD HOME</div>
    </section>
    <section className="trust-strip"><div><i className="bi bi-shield-check" /><span>Every pro, background checked</span></div><div><i className="bi bi-clock-history" /><span>Book around your schedule</span></div><div><i className="bi bi-chat-dots" /><span>Real support when you need it</span></div><div className="trust-rating"><i className="bi bi-star-fill" /><span>4.9 average customer rating</span></div></section>
    <section className="content-section category-section"><SectionHeading eyebrow="A good place to start" title="What can we help with?" copy="Little fixes, big projects, and all the in-between." action="See all services" onAction={() => onNavigate('services')} /><div className="category-grid">{categories.map((service, index) => <ServiceCard key={service.id} service={service} index={index} onClick={() => onService(service)} onBook={() => onBook(service)} />)}</div></section>
    <section className="home-feature"><div className="feature-image"><img src={assetUrl('/images/4.webp')} alt="Home painters refreshing a bright living room" /><span className="image-caption"><i className="bi bi-brush" /> A fresh coat. A fresh start.</span></div><div className="feature-copy"><span className="eyebrow">THE HOMECARE DIFFERENCE</span><h2>Not just a job.<br /><em>A neighborly kind of care.</em></h2><p>We think taking care of a home should feel like taking care of each other. That means good people, clear prices, and a little more care in every detail.</p><ul><li><i className="bi bi-check2" /> Skilled, vetted local professionals</li><li><i className="bi bi-check2" /> Upfront pricing, no awkward surprises</li><li><i className="bi bi-check2" /> Easy booking and helpful humans</li></ul><button className="button-outline" onClick={() => onNavigate('about')}>Get to know us <i className="bi bi-arrow-up-right" /></button></div></section>
    <section className="content-section pro-section"><SectionHeading eyebrow="Your local favorites" title="Good people, great work." copy="Meet a few of the pros our customers come back to." action="Meet the team" onAction={() => onNavigate('about')} /><div className="pro-grid">{providers.slice(0, 3).map((pro) => <div className="pro-card" key={pro.id}><div className={`pro-avatar ${pro.color}`}>{pro.initials}</div><div className="pro-info"><strong>{pro.name}</strong><span>{pro.specialty}</span><small><i className="bi bi-star-fill" /> {pro.rating} <b>·</b> {pro.jobs} jobs</small></div><i className="bi bi-arrow-up-right pro-arrow" /></div>)}</div></section>
    <section className="home-cta"><div><span className="eyebrow">A CALMER TO-DO LIST STARTS HERE</span><h2>Let’s make home<br />feel a little lighter.</h2></div><button className="button-light" onClick={() => onNavigate('services')}>Find your pro <i className="bi bi-arrow-up-right" /></button><div className="cta-sunburst">✳</div></section>
  </>;
}

function ServiceCard({ service, index = 0, onClick, onBook }) {
  return <article className={`service-card service-${service.tint || 'mint'}`} style={{ '--delay': `${index * 70}ms` }}><button className="service-card-main" onClick={onClick}><div className="service-image"><img src={assetUrl(service.image)} alt="" /><span className="service-icon"><i className={`bi ${service.icon || 'bi-house'}`} /></span><span className="service-rating"><i className="bi bi-star-fill" /> {service.rating || '4.8'}</span></div><div className="service-content"><div className="service-title"><h3>{service.name}</h3><span>from {money(service.price)}<small> / visit</small></span></div><p>{service.description}</p><div className="service-bottom"><span>{service.count || '100'}+ homes helped</span><span className="service-arrow"><i className="bi bi-arrow-up-right" /></span></div></div></button><button className="service-book-quick" onClick={onBook}>Book this service <i className="bi bi-arrow-right" /></button></article>;
}

function ServicesPage({ services, onService, onBook }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All services');
  const filters = ['All services', 'Repairs', 'Cleaning', 'Home care'];
  const filtered = services.filter((service) => `${service.name} ${service.description}`.toLowerCase().includes(search.toLowerCase())).filter((service) => filter === 'All services' || filter === 'Repairs' ? filter === 'All services' || ['plumbing', 'electrical', 'appliance', 'ac'].includes(service.id) : filter === 'Cleaning' ? ['cleaning', 'laundry'].includes(service.id) : ['painting', 'cooking'].includes(service.id));
  return <div className="inner-page"><div className="page-intro"><span className="eyebrow">THE SERVICE MENU</span><h1>Good help,<br /><em>right at home.</em></h1><p>Pick a little project or a whole-home refresh. Every pro is vetted, every price is clear.</p><div className="service-controls"><label className="search-box"><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try ‘leaky tap’ or ‘cleaning’" /></label><div className="filter-tabs">{filters.map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div></div><div className="catalog-grid">{filtered.map((service, index) => <ServiceCard key={service.id} service={service} index={index} onClick={() => onService(service)} onBook={() => onBook(service)} />)}{!filtered.length && <div className="empty-state"><i className="bi bi-search" /><h3>No matching services yet</h3><p>Try a different search or choose another category.</p></div>}</div><div className="service-help"><span><i className="bi bi-question-circle" /> Not sure what you need?</span><button onClick={() => onBook(services[0])}>Tell us what’s going on <i className="bi bi-arrow-up-right" /></button></div></div>;
}

function DetailPage({ service, providers, onBook, onBack }) {
  return <div className="inner-page detail-page"><button className="back-link" onClick={onBack}><i className="bi bi-arrow-left" /> All services</button><div className="detail-layout"><div className="detail-main"><div className="detail-hero-img"><img src={assetUrl(service.image)} alt={`${service.name} home service`} /><span className="detail-photo-label"><i className={`bi ${service.icon}`} /> HOMES, HANDLED WITH CARE</span></div><span className="eyebrow">HOMECARE SERVICE</span><h1>{service.name},<br /><em>without the hassle.</em></h1><p className="detail-description">{service.description}. Get matched with a friendly, qualified local pro who knows how to get it done right.</p><div className="detail-facts"><div><strong><i className="bi bi-star-fill" /> {service.rating || '4.8'}</strong><span>customer rating</span></div><div><strong>{service.count || '100'}+</strong><span>homes helped</span></div><div><strong>60–90 min</strong><span>typical visit</span></div></div><h3 className="detail-subheading">The right person for the job</h3><div className="detail-pro-list">{providers.slice(0, 2).map((pro) => <div className="detail-pro" key={pro.id}><div className={`pro-avatar ${pro.color}`}>{pro.initials}</div><span><strong>{pro.name}</strong><small>{pro.specialty}</small></span><span className="pro-stars"><i className="bi bi-star-fill" /> {pro.rating}</span></div>)}</div></div><aside className="booking-summary"><span className="eyebrow">SIMPLE, UPFRONT PRICING</span><div className="price-figure">{money(service.price)}<small> / visit</small></div><p>No surprise fees. Your pro will confirm the details before work begins.</p><button className="button-primary w-100" onClick={onBook}>Book {service.name.toLowerCase()} <i className="bi bi-arrow-up-right" /></button><div className="summary-divider" /><span className="summary-note"><i className="bi bi-shield-check" /> Vetted professionals</span><span className="summary-note"><i className="bi bi-calendar-check" /> Choose your time</span><span className="summary-note"><i className="bi bi-heart" /> Care you can count on</span></aside></div></div>;
}

function BookingPage({ services, selectedService, busy, onSubmit, onAuth, user }) {
  const [form, setForm] = useState({ serviceId: selectedService?.id || services[0]?.id || '', date: '', time: '', address: '', notes: '' });
  const service = services.find((item) => item.id === form.serviceId) || selectedService || services[0];
  function submit(event) { event.preventDefault(); if (!user) return onAuth(); onSubmit(form); }
  return <div className="inner-page booking-page"><span className="eyebrow">BOOK A HOMECARE PRO</span><h1>Let’s get it<br /><em>taken care of.</em></h1><div className="booking-layout"><form className="booking-form" onSubmit={submit}><div className="form-step"><span className="step-number">01</span><div className="step-fields"><h3>What do you need help with?</h3><label className="field-label" htmlFor="booking-service">Service</label><select id="booking-service" className="form-control custom-control" value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>{services.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div></div><div className="form-step"><span className="step-number">02</span><div className="step-fields"><h3>When should we come by?</h3><div className="row g-3"><div className="col-sm-6"><label className="field-label" htmlFor="booking-date">Preferred date</label><input id="booking-date" className="form-control custom-control" type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></div><div className="col-sm-6"><label className="field-label" htmlFor="booking-time">Time window</label><select id="booking-time" className="form-control custom-control" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required><option value="">Choose a time</option><option>8:00 AM – 10:00 AM</option><option>10:00 AM – 12:00 PM</option><option>12:00 PM – 2:00 PM</option><option>2:00 PM – 4:00 PM</option><option>4:00 PM – 6:00 PM</option></select></div></div></div></div><div className="form-step"><span className="step-number">03</span><div className="step-fields"><h3>Where can we find you?</h3><label className="field-label" htmlFor="booking-address">Home address</label><input id="booking-address" className="form-control custom-control" placeholder="Street, city, ZIP code" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /><label className="field-label mt-3" htmlFor="booking-notes">Anything else we should know? <span>(optional)</span></label><textarea id="booking-notes" className="form-control custom-control" rows="3" placeholder="A little detail helps your pro arrive prepared" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div></div><button className="button-primary booking-submit" type="submit" disabled={busy}>{busy ? 'Saving your request…' : user ? 'Confirm booking request' : 'Sign in to continue'} <i className="bi bi-arrow-up-right" /></button><p className="form-footnote"><i className="bi bi-lock" /> Your details stay private and are only shared with your pro.</p></form><aside className="booking-recap"><span className="eyebrow">YOUR BOOKING</span><div className="recap-image"><img src={assetUrl(service?.image || '/images/1.webp')} alt="" /><span><i className={`bi ${service?.icon || 'bi-house'}`} /></span></div><h3>{service?.name || 'Home service'}</h3><p>{service?.description}</p><div className="recap-row"><span>Service visit</span><strong>{money(service?.price)}</strong></div><div className="recap-row"><span>Booking fee</span><strong>Included</strong></div><div className="recap-total"><span>Estimated total</span><strong>{money(service?.price)}</strong></div><small>Payment is due after your service is complete.</small><div className="recap-secure"><i className="bi bi-shield-check" /> Protected by HomeCare promise</div></aside></div></div>;
}

function BookingsPage({ bookings, user, onStatus, onReview, onBrowse }) {
  if (!user) return <AccessDenied onNavigate={() => onBrowse()} title="Your bookings are waiting." copy="Sign in to see upcoming visits and your home-care history." />;
  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  return <div className="inner-page"><div className="page-intro compact-intro"><span className="eyebrow">YOUR HOMECARE ACCOUNT</span><h1>Your home,<br /><em>taken care of.</em></h1><p>Keep an eye on upcoming visits, see what’s next, and revisit the good work already done.</p></div><div className="booking-list-head"><h2>My bookings <span>{sorted.length}</span></h2><button className="button-outline" onClick={onBrowse}>Book a service <i className="bi bi-arrow-up-right" /></button></div>{sorted.length ? <div className="booking-list">{sorted.map((booking) => <BookingRow key={booking.id} booking={booking} onStatus={onStatus} onReview={onReview} admin={user.role === 'admin'} />)}</div> : <div className="empty-state"><span className="empty-icon"><i className="bi bi-calendar-heart" /></span><h3>Your next good thing starts here.</h3><p>When you book a pro, you’ll find all the details right here.</p><button className="button-primary" onClick={onBrowse}>Find a service <i className="bi bi-arrow-up-right" /></button></div>}</div>;
}

function BookingRow({ booking, onStatus, onReview, admin }) {
  const statusClass = (booking.status || 'Requested').toLowerCase().replaceAll(' ', '-');
  return <article className="booking-row"><div className="booking-date"><strong>{booking.date ? new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' }) : 'NEW'}</strong><span>{booking.date ? new Date(`${booking.date}T12:00:00`).getDate() : '—'}</span></div><div className="booking-info"><div className="booking-name-line"><h3>{booking.serviceName || 'Home service'}</h3><span className={`status-pill status-${statusClass}`}>{booking.status || 'Requested'}</span></div><p><i className="bi bi-clock" /> {booking.time || 'Time to be confirmed'} <b>·</b> {booking.customerName || 'HomeCare customer'}</p><p><i className="bi bi-geo-alt" /> {booking.address || 'Address to be confirmed'}</p></div><div className="booking-price">{money(booking.price)}<small>{booking.paymentStatus || 'Payment pending'}</small></div><div className="booking-row-actions">{admin ? <select aria-label={`Update status for ${booking.serviceName}`} className="status-select" value={booking.status || 'Requested'} onChange={(event) => onStatus(booking, event.target.value)}>{['Requested', 'Confirmed', 'In progress', 'Completed', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}</select> : booking.status === 'Completed' ? <button className="icon-button" title="Leave a review" aria-label="Leave a review" onClick={onReview}><i className="bi bi-star" /></button> : ['Requested', 'Confirmed'].includes(booking.status) && <button className="cancel-link" onClick={() => onStatus(booking, 'Cancelled')}>Cancel</button>}</div></article>;
}

function ReviewsPage({ reviews, user, onSubmit, onAuth }) {
  const [form, setForm] = useState({ serviceName: '', rating: '5', text: '' });
  const average = reviews.length ? (reviews.reduce((total, review) => total + Number(review.rating || 5), 0) / reviews.length).toFixed(1) : '5.0';
  function submit(event) { event.preventDefault(); if (!user) return onAuth(); onSubmit({ ...form, rating: Number(form.rating) }); setForm({ serviceName: '', rating: '5', text: '' }); }
  return <div className="inner-page reviews-page"><div className="reviews-hero"><div><span className="eyebrow">KIND WORDS, REAL HOMES</span><h1>Care that<br /><em>comes around.</em></h1><p>We think good work deserves a good word. Here are a few notes from our neighbors.</p></div><div className="review-score"><strong>{average}</strong><span className="review-stars">★★★★★</span><small>from {reviews.length} thoughtful reviews</small></div></div><div className="review-grid">{reviews.map((review, index) => <article className="review-card" key={review.id}><div className="review-card-top"><span className={`review-avatar review-avatar-${index % 3}`}>{review.name?.slice(0, 1) || 'H'}</span><span><strong>{review.name || 'HomeCare customer'}</strong><small>{review.serviceName}</small></span><span className="review-stars">{'★'.repeat(Number(review.rating || 5))}</span></div><p>“{review.text}”</p><small className="review-date">{new Date(review.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</small></article>)}</div><form className="review-form" onSubmit={submit}><div><span className="eyebrow">YOUR TURN</span><h2>Had a good experience?</h2><p>A few words can help someone else feel at home with their choice.</p></div><div className="review-form-fields"><div className="row g-3"><div className="col-sm-6"><label className="field-label" htmlFor="review-service">Service</label><select id="review-service" className="form-control custom-control" required value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })}><option value="">Choose a service</option>{SERVICES.map((service) => <option key={service.id}>{service.name}</option>)}</select></div><div className="col-sm-6"><label className="field-label" htmlFor="review-rating">Your rating</label><select id="review-rating" className="form-control custom-control" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })}><option value="5">★★★★★ — Loved it</option><option value="4">★★★★ — Really good</option><option value="3">★★★ — Good</option><option value="2">★★ — Could be better</option><option value="1">★ — Not for me</option></select></div></div><label className="field-label mt-3" htmlFor="review-text">Your note</label><textarea id="review-text" className="form-control custom-control" required minLength="8" rows="3" placeholder="What made your experience special?" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} /><button className="button-primary mt-3" type="submit">Share your review <i className="bi bi-arrow-up-right" /></button></div></form></div>;
}

function AboutPage({ onNavigate }) {
  return <div className="inner-page about-page"><div className="about-hero"><div><span className="eyebrow">A LITTLE MORE HUMAN</span><h1>Home should<br />feel like <em>home.</em></h1><p>We started HomeCare with a simple thought: finding help for the place you love shouldn’t be hard.</p><button className="button-primary" onClick={() => onNavigate('services')}>Find your pro <i className="bi bi-arrow-up-right" /></button></div><img src={assetUrl('/images/4.webp')} alt="A bright home being cared for by local painting professionals" /></div><section className="about-story"><span className="eyebrow">THE WAY WE SEE IT</span><h2>Care is in the little things.</h2><p>A pro who shows up when they say they will. A price that makes sense. Someone who takes their shoes off at the door. We bring all those little things together so you can spend less time managing your home and more time living in it.</p><div className="values-grid"><article><span>01</span><i className="bi bi-person-check" /><h3>People first</h3><p>Good work starts with good people. Our pros are thoughtfully vetted and locally rooted.</p></article><article><span>02</span><i className="bi bi-receipt-cutoff" /><h3>Clear from the start</h3><p>Upfront pricing and honest communication, because home projects shouldn’t come with guesswork.</p></article><article><span>03</span><i className="bi bi-heart" /><h3>A little extra care</h3><p>We’re here to make the whole experience feel easier, from your first click to the final tidy-up.</p></article></div></section><div className="about-bottom"><div><span className="eyebrow">LET’S MAKE HOME EASIER</span><h2>There’s good help<br />right around the corner.</h2></div><button className="button-primary" onClick={() => onNavigate('services')}>Explore HomeCare <i className="bi bi-arrow-up-right" /></button></div></div>;
}

function ContactPage({ onNavigate }) {
  const [sent, setSent] = useState(false);
  function submit(event) { event.preventDefault(); setSent(true); }
  return <div className="inner-page contact-page"><div className="contact-heading"><div><span className="eyebrow">A REAL PERSON IS HERE</span><h1>We’re here<br /><em>to help.</em></h1><p>Questions, a special request, or just want to talk it through? We’d love to hear from you.</p></div><div className="contact-hours"><span className="contact-open"><i /> HERE FOR YOU</span><p>Monday–Saturday<br />8:00 am–6:00 pm</p><small>We usually reply within one business day.</small></div></div><div className="contact-layout"><div className="contact-methods"><a href="tel:+18005550184"><span><i className="bi bi-telephone" /></span><small>GIVE US A CALL</small><strong>+1 (800) 555-0184</strong><em>We’re happy to help <i className="bi bi-arrow-up-right" /></em></a><a href="mailto:hello@homecare.example"><span><i className="bi bi-envelope" /></span><small>SEND A NOTE</small><strong>hello@homecare.example</strong><em>We’ll get back to you soon <i className="bi bi-arrow-up-right" /></em></a><button onClick={() => onNavigate('services')}><span><i className="bi bi-compass" /></span><small>LOOKING FOR A PRO?</small><strong>Find a home service</strong><em>Browse what we can do <i className="bi bi-arrow-up-right" /></em></button></div><form className="contact-form" onSubmit={submit}>{sent ? <div className="contact-success"><i className="bi bi-check-circle" /><h2>We’ve got your note.</h2><p>Thanks for reaching out. A real person from our team will be in touch shortly.</p><button className="text-action" type="button" onClick={() => setSent(false)}>Send another message <i className="bi bi-arrow-up-right" /></button></div> : <><h2>Send us a note</h2><p>Tell us what’s on your mind and we’ll take it from here.</p><label className="field-label" htmlFor="contact-name">Your name</label><input className="form-control custom-control" id="contact-name" required placeholder="Jane Smith" /><label className="field-label mt-3" htmlFor="contact-email">Email address</label><input className="form-control custom-control" id="contact-email" type="email" required placeholder="jane@example.com" /><label className="field-label mt-3" htmlFor="contact-message">How can we help?</label><textarea className="form-control custom-control" id="contact-message" rows="4" required placeholder="A little detail goes a long way…" /><button className="button-primary mt-3" type="submit">Send your note <i className="bi bi-arrow-up-right" /></button></>}</form></div></div>;
}

function AdminPage({ services, bookings, customers, onRefreshCustomers, onSaveService, onDeleteService, onStatus, onNavigate }) {
  const [section, setSection] = useState('overview');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', image: '/images/1.webp', icon: 'bi-house', tint: 'mint' });
  const completed = bookings.filter((booking) => booking.status === 'Completed').length;
  function openEditor(service = null) {
    setEditing(service?.id || 'new');
    setForm(service ? { ...service } : { name: '', description: '', price: '', image: '/images/1.webp', icon: 'bi-house', tint: 'mint' });
  }
  function submit(event) {
    event.preventDefault();
    onSaveService({ ...form, id: editing === 'new' ? `service-${Date.now()}` : editing, price: Number(form.price), count: form.count || '0', rating: form.rating || '5.0' });
    setEditing(null);
  }
  return <div className="admin-layout"><aside className="admin-sidebar"><div className="admin-side-title"><span className="brand-mark"><i className="bi bi-house-heart-fill" /></span><span>HOMECARE<br /><small>ADMIN STUDIO</small></span></div><span className="admin-label">WORKSPACE</span>{[['overview', 'Overview', 'bi-grid-1x2'], ['bookings', 'Bookings', 'bi-calendar2-check'], ['services', 'Services', 'bi-tools'], ['customers', 'Customers', 'bi-people']].map(([id, label, icon]) => <button key={id} className={section === id ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => { setSection(id); setEditing(null); }}><i className={`bi ${icon}`} />{label}{id === 'bookings' && bookings.length > 0 && <span>{bookings.length}</span>}</button>)}<div className="admin-side-bottom"><button onClick={() => onNavigate('home')}><i className="bi bi-arrow-left" /> View storefront</button><small>HOMECARE ADMIN · 1.0</small></div></aside><section className="admin-content"><div className="admin-topline"><div><span className="eyebrow">YOUR BUSINESS, AT A GLANCE</span><h1>{section === 'overview' ? 'Good morning.' : section[0].toUpperCase() + section.slice(1) + '.'}</h1></div><div className="admin-top-actions"><span className="admin-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span><button className="admin-profile">HC</button></div></div>
    {section === 'overview' && <><div className="admin-stat-grid"><article><span>ALL BOOKINGS</span><strong>{bookings.length.toString().padStart(2, '0')}</strong><small><i className="bi bi-calendar2-check" /> requests to take care of</small></article><article><span>NEEDS ATTENTION</span><strong>{bookings.filter((booking) => ['Requested', 'Confirmed'].includes(booking.status)).length.toString().padStart(2, '0')}</strong><small><i className="bi bi-hourglass-split" /> awaiting completion</small></article><article><span>COMPLETED VISITS</span><strong>{completed.toString().padStart(2, '0')}</strong><small><i className="bi bi-check2-circle" /> homes made happier</small></article><article><span>ACTIVE SERVICES</span><strong>{services.length.toString().padStart(2, '0')}</strong><small><i className="bi bi-stars" /> ways to lend a hand</small></article></div><div className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">THE LATEST</span><h2>Recent bookings</h2></div><button className="text-action" onClick={() => setSection('bookings')}>View all <i className="bi bi-arrow-up-right" /></button></div>{bookings.length ? <div className="admin-booking-table">{bookings.slice(0, 5).map((booking) => <BookingRow key={booking.id} booking={booking} onStatus={onStatus} onReview={() => {}} admin />)}</div> : <div className="admin-empty"><i className="bi bi-calendar-heart" /><p>Your new booking requests will show up here.</p><button className="text-action" onClick={() => onNavigate('services')}>View storefront <i className="bi bi-arrow-up-right" /></button></div>}</div><div className="admin-bottom-grid"><div className="admin-panel admin-service-short"><div className="admin-panel-heading"><div><span className="eyebrow">YOUR MENU</span><h2>Popular services</h2></div><button className="text-action" onClick={() => setSection('services')}>Manage <i className="bi bi-arrow-up-right" /></button></div>{services.slice(0, 4).map((service) => <div className="admin-mini-service" key={service.id}><span className="mini-service-icon"><i className={`bi ${service.icon}`} /></span><strong>{service.name}</strong><small>{money(service.price)} / visit</small></div>)}</div><div className="admin-note"><span className="eyebrow">A LITTLE REMINDER</span><i className="bi bi-heart-fill" /><h3>Good work builds<br />good neighborhoods.</h3><p>Thanks for making home feel a little easier, one visit at a time.</p></div></div></>}
    {section === 'bookings' && <div className="admin-panel admin-full-panel"><div className="admin-panel-heading"><div><span className="eyebrow">CUSTOMER REQUESTS</span><h2>Manage bookings</h2></div><span className="admin-count">{bookings.length} total</span></div>{bookings.length ? <div className="admin-booking-table">{bookings.map((booking) => <BookingRow key={booking.id} booking={booking} onStatus={onStatus} onReview={() => {}} admin />)}</div> : <div className="admin-empty"><i className="bi bi-calendar-heart" /><p>No booking requests to review yet.</p></div>}</div>}
    {section === 'services' && <div className="admin-panel admin-full-panel"><div className="admin-panel-heading"><div><span className="eyebrow">WHAT HOMECARE CAN DO</span><h2>Manage services</h2></div><button className="button-primary" onClick={() => openEditor()}>Add service <i className="bi bi-plus-lg" /></button></div>{editing ? <form className="service-editor" onSubmit={submit}><div className="service-editor-heading"><h3>{editing === 'new' ? 'Add a service' : 'Edit service'}</h3><button type="button" className="icon-button" aria-label="Close editor" onClick={() => setEditing(null)}><i className="bi bi-x-lg" /></button></div><div className="row g-3"><div className="col-sm-6"><label className="field-label" htmlFor="service-name">Service name</label><input id="service-name" className="form-control custom-control" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="col-sm-6"><label className="field-label" htmlFor="service-price">Starting price ($)</label><input id="service-price" className="form-control custom-control" type="number" min="1" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div><div className="col-12"><label className="field-label" htmlFor="service-description">Short description</label><input id="service-description" className="form-control custom-control" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div className="col-sm-6"><label className="field-label" htmlFor="service-image">Image path</label><input id="service-image" className="form-control custom-control" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></div><div className="col-sm-6"><label className="field-label" htmlFor="service-icon">Bootstrap icon class</label><input id="service-icon" className="form-control custom-control" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></div></div><button className="button-primary mt-3" type="submit">Save service <i className="bi bi-check2" /></button></form> : <div className="admin-service-list">{services.map((service) => <div className="admin-service-row" key={service.id}><img src={assetUrl(service.image)} alt="" /><div><strong>{service.name}</strong><small>{service.description}</small></div><span>{money(service.price)}<small> / visit</small></span><button className="icon-button" title={`Edit ${service.name}`} aria-label={`Edit ${service.name}`} onClick={() => openEditor(service)}><i className="bi bi-pencil" /></button><button className="icon-button danger-icon" title={`Delete ${service.name}`} aria-label={`Delete ${service.name}`} onClick={() => onDeleteService(service)}><i className="bi bi-trash3" /></button></div>)}</div>}</div>}
    {section === 'customers' && <div className="admin-panel admin-full-panel"><div className="admin-panel-heading"><div><span className="eyebrow">PEOPLE WHO TRUST US AT HOME</span><h2>Customers</h2></div><div className="d-flex align-items-center gap-2"><span className="admin-count">{customers.length} registered</span><button className="icon-button" title="Refresh customer list" aria-label="Refresh customer list" onClick={onRefreshCustomers}><i className="bi bi-arrow-clockwise" /></button></div></div>{customers.length ? <div className="admin-customer-list">{customers.map((customer) => <div className="admin-customer-row" key={customer.id}><span className="customer-avatar">{customer.name?.slice(0, 1) || 'H'}</span><div><strong>{customer.name || 'HomeCare customer'}</strong><small>{customer.email || 'Email not provided'}</small></div><span>{bookings.filter((booking) => booking.userId === customer.id).length} booking(s)</span><a href={`mailto:${customer.email || ''}`} title="Email customer" aria-label={`Email ${customer.name || 'customer'}`}><i className="bi bi-envelope" /></a></div>)}</div> : <div className="admin-empty"><i className="bi bi-people" /><p>No customer accounts yet.</p><button className="text-action" onClick={onRefreshCustomers}>Refresh list <i className="bi bi-arrow-clockwise" /></button></div>}</div>}
    </section></div>;
}

function AccessDenied({ onNavigate, title = 'This is your home base.', copy = 'Sign in to see your upcoming visits and keep everything in one place.' }) {
  return <div className="inner-page access-page"><div className="access-mark"><i className="bi bi-house-heart" /></div><span className="eyebrow">HOMECARE ACCOUNT</span><h1>{title}</h1><p>{copy}</p><button className="button-primary" onClick={() => onNavigate('auth')}>Sign in to continue <i className="bi bi-arrow-up-right" /></button></div>;
}

function Footer({ onNavigate }) {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand-block"><button className="brand footer-brand" onClick={() => onNavigate('home')}><span className="brand-mark"><i className="bi bi-house-heart-fill" /></span><span>homecare<span className="brand-period">.</span></span></button><p>Good people for the place you love.</p><span className="footer-location"><i className="bi bi-geo-alt" /> Serving homes across your neighborhood</span></div><div className="footer-col"><span>EXPLORE</span><button onClick={() => onNavigate('services')}>All services</button><button onClick={() => onNavigate('about')}>Our story</button><button onClick={() => onNavigate('reviews')}>Customer notes</button><button onClick={() => onNavigate('mybookings')}>My bookings</button></div><div className="footer-col"><span>GET IN TOUCH</span><a href="tel:+18005550184">+1 (800) 555-0184</a><a href="mailto:hello@homecare.example">hello@homecare.example</a><small>Mon–Sat, 8 am–6 pm</small></div><div className="footer-signoff"><span className="footer-spark">✳</span><p>More time for<br />the good stuff.</p></div></div><div className="footer-bottom"><span>© 2026 HomeCare. Made for the place you love.</span><span><button onClick={() => onNavigate('contact')}>Contact</button><a href="tel:+18005550184">Support</a><span>Made with a little extra care <i className="bi bi-heart-fill" /></span></span></div></footer>;
}

export default App;