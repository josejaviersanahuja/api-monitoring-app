<h1 style="text-align:center; background:lightyellow">Monitoring App</h1>
<h2>It's a portfolio project where I display all my knowledge on NODEJS, as I built a server with NO EXPRESS, where I serve statics with MY OWN VIEW ENGINE, I serve 20 different endpoints with MY OWN ROUTER.</h2>
<hr>
<h2>Dependencies</h2>
<p>The only dependency is mongoose. As a Log In has been implemented, I decided to persist users and tokens in a DB. It's the only reason for a package.json in this project.</p>
<hr>
<h2>Other features built</h2>
<p>I built a dotEnvReader which was helpful on development and testing, but not for production</p>
<p>I built a CLI that is not useful for production, but its still in the files</p>
<p>I built some workers that performs the monitoring and some clean old data in my DATABASE to mantained clean my DB</p>
<p>The App was prepared for sending an SMS with TWILIO at the exact moment the monitor detects a critical change on the website we are monitoring. Even though, this feature has been commented and not implemented as this APP is meant only for a portfolio right now.</p>
<hr>
<h2>Usage</h2>
<p>Go to the website, <a href="https://mighty-headland-82380.herokuapp.com/" target="_blank" rel="no referrer">https://mighty-headland-82380.herokuapp.com/</a>, Sign up with a mobile phone and try it yourself.</p>