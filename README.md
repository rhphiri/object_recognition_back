# object_recognition_back

This repository contains the server backend files of an object recognition app. The function of the app is to analyse a picture submitted by a user and successfully identify all the main objects in that picture with the help of an AI. 
The frontend is a website where the user logs in, enters the url to an image that he/she wants analysed, and then displays the output of that analysis. 
The backend is the one that analyses the login information to see if it valid and sends a response to the frontend.
The backend receives the image url sent by the user who has successfully logged in and communicates with an artificial intelligence called Clarifai about the said image. Whatever information is gained about the image is then passed on to the frontend to be displayed to the user.
