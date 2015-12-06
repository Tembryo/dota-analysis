client_body_in_file_only clean;
client_body_buffer_size 1m;
client_header_buffer_size 128k;
client_max_body_size 300m;

client_body_timeout 500;
client_header_timeout 500;
keepalive_timeout 500 500;
sendfile on;
send_timeout 500;

keepalive_requests 100;
tcp_nodelay on;
reset_timedout_connection on;
